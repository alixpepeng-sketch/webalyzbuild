'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ChatBubble from '@/components/ChatBubble';
import FileUploadZone from '@/components/FileUploadZone';
import IconUploader from '@/components/IconUploader';
import BuildLogTerminal from '@/components/BuildLogTerminal';
import ApkDownloadBubble from '@/components/ApkDownloadBubble';
import { useViewportFix } from '@/lib/useViewportFix';
import { ParsedZip } from '@/lib/zipHandler';
import { IconResult } from '@/lib/iconResizer';
import { BuildStep, getConfigStatus, pollBuild, pushProject, triggerBuild } from '@/lib/github';

const PKG_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const STORE_KEY = 'alyzz_apk_history';

type Apk = { appName: string; sizeMb: string; url: string };
type Msg = {
  id: number;
  role: 'ai' | 'user';
  kind: 'text' | 'files' | 'ready' | 'log' | 'apk';
  text?: string;
  files?: string[];
  steps?: BuildStep[];
  note?: string;
  apk?: Apk;
  stream?: boolean;
};

export default function Home() {
  useViewportFix();

  const [appName, setAppName] = useState('');
  const [pkg, setPkg] = useState('');
  const [icon, setIcon] = useState<IconResult | null>(null);
  const [zip, setZip] = useState<ParsedZip | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [building, setBuilding] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastSig = useRef('');
  const cfg = useMemo(() => getConfigStatus(), []);

  const pkgValid = PKG_RE.test(pkg);
  const ready = appName.trim().length > 0 && pkgValid && !!icon && !!zip;

  const add = useCallback((m: Omit<Msg, 'id'>) => {
    const id = idRef.current++;
    setMessages((prev) => [...prev, { ...m, id }]);
    return id;
  }, []);
  const upd = useCallback((id: number, patch: Partial<Msg>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);
  const ai = useCallback((text: string) => add({ role: 'ai', kind: 'text', text, stream: true }), [add]);

  // Sambutan + restore APK terakhir
  useEffect(() => {
    add({
      role: 'ai',
      kind: 'text',
      stream: true,
      text: 'ALYZZ AI siap. Isi App Name, Package Name, Icon, dan upload ZIP project Flutter di panel konfigurasi. Saya hanya operator build, semua file berasal dari kamu.',
    });
    try {
      const hist = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (Array.isArray(hist) && hist.length) {
        add({ role: 'ai', kind: 'text', text: 'Build terakhir tersimpan:' });
        add({ role: 'ai', kind: 'apk', apk: hist[0] });
      }
    } catch {
      /* abaikan */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto scroll saat konten tumbuh (termasuk streaming)
  useEffect(() => {
    const el = contentRef.current;
    const sc = scrollRef.current;
    if (!el || !sc) return;
    const ro = new ResizeObserver(() => {
      sc.scrollTop = sc.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Umumkan kesiapan build
  const sig = `${appName.trim()}|${pkg}|${icon?.id}|${zip?.id}`;
  useEffect(() => {
    if (!ready || lastSig.current === sig) return;
    const t = setTimeout(() => {
      lastSig.current = sig;
      add({
        role: 'ai',
        kind: 'ready',
        stream: true,
        text: `File diterima. ${zip!.paths.length} file detected. Package ${pkg} OK. Icon 1:1 OK. Siap build?`,
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sig]);

  function onZipParsed(z: ParsedZip) {
    setZip(z);
    add({ role: 'ai', kind: 'files', files: z.paths, text: `Project ZIP dibaca: ${z.name}` });
  }

  async function startBuild() {
    if (building) return;
    if (!ready || !zip || !icon) {
      ai('Data belum lengkap. Lengkapi App Name, Package Name, Icon, dan ZIP.');
      return;
    }
    if (!cfg.ok) {
      ai(`Konfigurasi GitHub belum lengkap (${cfg.missing.join(', ')}). Buka halaman /setup.`);
      return;
    }
    setBuilding(true);
    const name = appName.trim();
    const logId = add({
      role: 'ai',
      kind: 'log',
      steps: [{ name: 'Uploading project to GitHub', status: 'running' }],
      note: 'Mulai upload...',
    });
    try {
      await pushProject(zip.entries, icon.files, { appName: name, pkg }, (d, t) =>
        upd(logId, { note: `Upload ${d}/${t} file` })
      );
      const uploaded: BuildStep[] = [{ name: 'Uploading project to GitHub', status: 'done' }];
      upd(logId, { steps: [...uploaded, { name: 'Triggering workflow', status: 'running' }], note: undefined });
      const requestId = await triggerBuild(name, pkg);
      uploaded.push({ name: 'Triggering workflow', status: 'done' });
      upd(logId, { steps: [...uploaded, { name: 'Waiting for GitHub runner', status: 'running' }] });

      const apk = await pollBuild(requestId, (steps, runUrl) =>
        upd(logId, { steps: [...uploaded, ...steps], note: runUrl })
      );

      const info: Apk = { appName: name, sizeMb: apk.sizeMb, url: apk.url };
      try {
        const hist = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        const next = [{ ...info, time: Date.now() }, ...(Array.isArray(hist) ? hist : [])].slice(0, 20);
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* abaikan */
      }
      add({ role: 'ai', kind: 'apk', apk: info });
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === logId
            ? { ...m, steps: (m.steps || []).map((s) => (s.status === 'running' ? { ...s, status: 'failed' as const } : s)) }
            : m
        )
      );
      ai(`Build gagal. ${e?.message || 'Terjadi kesalahan tidak dikenal.'}`);
    } finally {
      setBuilding(false);
    }
  }

  function send() {
    const t = input.trim();
    if (!t) return;
    setInput('');
    add({ role: 'user', kind: 'text', text: t });
    if (/\bbuild\b/i.test(t) && ready) {
      startBuild();
      return;
    }
    if (!ready) {
      const missing: string[] = [];
      if (!appName.trim()) missing.push('App Name');
      if (!pkgValid) missing.push('Package Name valid');
      if (!icon) missing.push('Icon');
      if (!zip) missing.push('ZIP project');
      ai(`Belum lengkap: ${missing.join(', ')}. Isi di panel konfigurasi.`);
    } else {
      ai('Semua data lengkap. Tekan tombol BUILD APK atau ketik BUILD. Saya hanya operator build dan tidak membuat kode.');
    }
  }

  const missingChecks = [
    { label: 'App Name', ok: appName.trim().length > 0 },
    { label: 'Package Name', ok: pkgValid },
    { label: 'Icon 1:1', ok: !!icon },
    { label: 'ZIP Project', ok: !!zip },
    { label: 'GitHub Config', ok: cfg.ok },
  ];

  return (
    <div className="flex flex-col bg-white text-black" style={{ height: 'var(--vh, 100dvh)' }}>
      <header className="h-[60px] shrink-0 border-b-[3px] border-black bg-white flex items-center justify-between px-4">
        <h1 className="font-bold tracking-tight text-[15px] sm:text-lg">ALYZZ AI • BUILDER READY</h1>
        <button type="button" onClick={() => setSheetOpen(true)} className="brut-btn md:hidden px-3 py-1.5 text-sm">
          [ CONFIG ]
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex flex-col min-w-0 bg-mist">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div ref={contentRef} className="mx-auto max-w-2xl space-y-5 pb-2">
              {messages.map((m) => {
                if (m.kind === 'apk' && m.apk)
                  return (
                    <ChatBubble key={m.id} role="ai">
                      <ApkDownloadBubble appName={m.apk.appName} sizeMb={m.apk.sizeMb} url={m.apk.url} />
                    </ChatBubble>
                  );
                if (m.kind === 'log')
                  return (
                    <ChatBubble key={m.id} role="ai">
                      <div className="min-w-[250px] sm:min-w-[380px]">
                        <BuildLogTerminal steps={m.steps || []} note={m.note} />
                      </div>
                    </ChatBubble>
                  );
                if (m.kind === 'files')
                  return (
                    <ChatBubble key={m.id} role="ai" text={m.text}>
                      <div className="mt-2 max-h-48 overflow-y-auto border-[3px] border-black bg-mist p-2 font-mono text-[11px] leading-snug">
                        {(m.files || []).slice(0, 80).map((f) => (
                          <div key={f} className="break-all">
                            {f}
                          </div>
                        ))}
                        {(m.files || []).length > 80 && <div>... +{(m.files || []).length - 80} file lainnya</div>}
                      </div>
                    </ChatBubble>
                  );
                if (m.kind === 'ready')
                  return (
                    <ChatBubble
                      key={m.id}
                      role="ai"
                      text={m.text}
                      stream={m.stream}
                      action={
                        <button type="button" disabled={building} onClick={startBuild} className="brut-btn w-full py-3 text-base">
                          [ BUILD APK ]
                        </button>
                      }
                    />
                  );
                return <ChatBubble key={m.id} role={m.role} text={m.text} stream={m.stream} />;
              })}
            </div>
          </div>

          <div className="sticky bottom-0 shrink-0 border-t-[3px] border-black bg-white p-3">
            <div className="mx-auto max-w-2xl flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ketik BUILD atau pertanyaan..."
                className="brut-input flex-1 min-w-0"
              />
              <button type="button" onClick={send} className="brut-btn px-4">
                KIRIM
              </button>
            </div>
          </div>
        </main>

        {sheetOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSheetOpen(false)} />}

        <aside
          className={`fixed inset-x-0 bottom-0 z-30 max-h-[85%] overflow-y-auto bg-white border-t-[3px] border-black transition-transform duration-200 ${
            sheetOpen ? 'translate-y-0' : 'translate-y-full'
          } md:static md:translate-y-0 md:w-[380px] md:shrink-0 md:max-h-none md:border-t-0 md:border-l-[3px]`}
        >
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold tracking-widest">CONFIG</h2>
              <button type="button" onClick={() => setSheetOpen(false)} className="brut-btn md:hidden px-3 py-1 text-sm">
                TUTUP
              </button>
            </div>

            <label className="block">
              <span className="block text-xs font-bold mb-1">APP NAME</span>
              <input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Kalkulator Toko" className="brut-input" />
            </label>

            <label className="block">
              <span className="block text-xs font-bold mb-1">PACKAGE NAME</span>
              <input
                value={pkg}
                onChange={(e) => setPkg(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="com.sukoharjo.jualan"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="brut-input"
              />
              <span className="block text-[11px] mt-1">
                {pkg === ''
                  ? 'Bebas tentukan sendiri. Contoh: com.alyz.kalkulator'
                  : pkgValid
                  ? 'Format valid.'
                  : 'Tidak valid. Huruf kecil, minimal 2 segmen dipisah titik, tiap segmen diawali huruf.'}
              </span>
            </label>

            <div>
              <span className="block text-xs font-bold mb-1">ICON APK (1:1)</span>
              <IconUploader icon={icon} onReady={setIcon} onError={(m) => ai(m)} />
            </div>

            <div>
              <span className="block text-xs font-bold mb-1">ZIP PROJECT FLUTTER</span>
              <FileUploadZone parsed={zip} onParsed={onZipParsed} onError={(m) => ai(m)} />
            </div>

            <div className="border-[3px] border-black p-3 bg-mist">
              <p className="text-xs font-bold mb-2">STATUS</p>
              <ul className="text-sm space-y-1">
                {missingChecks.map((c) => (
                  <li key={c.label} className="flex justify-between">
                    <span>{c.label}</span>
                    <span className={c.ok ? 'font-bold' : 'underline'}>{c.ok ? 'OK' : 'KURANG'}</span>
                  </li>
                ))}
              </ul>
              {!cfg.ok && (
                <Link href="/setup" className="block mt-3 text-sm font-bold underline">
                  Buka /setup untuk isi token GitHub
                </Link>
              )}
            </div>

            <button type="button" disabled={!ready || building} onClick={startBuild} className="brut-btn w-full py-3">
              {building ? 'BUILDING...' : '[ BUILD APK ]'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
