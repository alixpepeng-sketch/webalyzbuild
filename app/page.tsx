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
      sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
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

  const checks = [
    { label: 'App Name', ok: appName.trim().length > 0 },
    { label: 'Package Name', ok: pkgValid },
    { label: 'Icon 1:1', ok: !!icon },
    { label: 'ZIP Project', ok: !!zip },
    { label: 'GitHub Config', ok: cfg.ok },
  ];
  const doneCount = checks.filter((c) => c.ok).length;

  return (
    <div className="flex flex-col gap-3 p-3 text-black" style={{ height: 'var(--vh, 100dvh)' }}>
      <header className="flex h-[60px] shrink-0 items-center justify-between rounded-3xl bg-white/80 px-4 shadow-soft ring-1 ring-black/5 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-30" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-black" />
          </span>
          <h1 className="truncate text-[15px] font-bold tracking-tight sm:text-lg">ALYZZ AI • BUILDER READY</h1>
        </div>
        <button type="button" onClick={() => setSheetOpen(true)} className="btn px-4 py-2 text-sm md:hidden">
          Config {doneCount}/5
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white/70 shadow-soft ring-1 ring-black/5 backdrop-blur">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl bg-mist p-3 font-mono text-[11px] leading-snug text-black/70">
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
                        <button type="button" disabled={building} onClick={startBuild} className="btn w-full py-3.5 text-base">
                          BUILD APK
                        </button>
                      }
                    />
                  );
                return <ChatBubble key={m.id} role={m.role} text={m.text} stream={m.stream} />;
              })}
            </div>
          </div>

          <div className="sticky bottom-0 shrink-0 p-3">
            <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-soft ring-1 ring-black/10 transition-shadow focus-within:ring-2 focus-within:ring-black">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ketik BUILD atau pertanyaan..."
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-black/35"
              />
              <button type="button" onClick={send} aria-label="Kirim" className="btn h-11 w-11 shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5m0 0l-6 6m6-6l6 6" />
                </svg>
              </button>
            </div>
          </div>
        </main>

        <div
          aria-hidden
          onClick={() => setSheetOpen(false)}
          className={`fixed inset-0 z-20 bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
            sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />

        <aside
          className={`fixed inset-x-2 bottom-2 z-30 max-h-[88%] overflow-y-auto rounded-[32px] bg-white shadow-sheet ring-1 ring-black/5 transition-transform duration-[400ms] ease-sheet ${
            sheetOpen ? 'translate-y-0' : 'translate-y-[120%]'
          } md:static md:max-h-none md:w-[380px] md:shrink-0 md:translate-y-0 md:rounded-[28px] md:shadow-soft`}
        >
          <div className="space-y-5 p-5">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-black/15 md:hidden" />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Konfigurasi</h2>
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-ghost px-4 py-1.5 text-sm md:hidden">
                Tutup
              </button>
            </div>

            <label className="block">
              <span className="label">App Name</span>
              <input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Kalkulator Toko" className="field" />
            </label>

            <label className="block">
              <span className="label">Package Name</span>
              <input
                value={pkg}
                onChange={(e) => setPkg(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="com.sukoharjo.jualan"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="field"
              />
              <span className={`mt-1.5 block px-1 text-[11px] ${pkg !== '' && !pkgValid ? 'font-semibold text-black' : 'text-black/50'}`}>
                {pkg === ''
                  ? 'Bebas tentukan sendiri. Contoh: com.alyz.kalkulator'
                  : pkgValid
                  ? 'Format valid.'
                  : 'Tidak valid. Huruf kecil, minimal 2 segmen dipisah titik, tiap segmen diawali huruf.'}
              </span>
            </label>

            <div>
              <span className="label">Icon APK (1:1)</span>
              <IconUploader icon={icon} onReady={setIcon} onError={(m) => ai(m)} />
            </div>

            <div>
              <span className="label">ZIP Project Flutter</span>
              <FileUploadZone parsed={zip} onParsed={onZipParsed} onError={(m) => ai(m)} />
            </div>

            <div className="rounded-2xl bg-mist p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-black/50">Status</p>
                <p className="text-xs font-semibold">{doneCount}/5</p>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-black transition-all duration-500 ease-smooth" style={{ width: `${(doneCount / 5) * 100}%` }} />
              </div>
              <ul className="space-y-2 text-sm">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span className={c.ok ? 'font-semibold' : 'text-black/50'}>{c.label}</span>
                    <CheckDot ok={c.ok} />
                  </li>
                ))}
              </ul>
              {!cfg.ok && (
                <Link href="/setup" className="mt-3 block text-sm font-semibold underline underline-offset-4">
                  Buka /setup untuk isi token GitHub
                </Link>
              )}
            </div>

            <button type="button" disabled={!ready || building} onClick={startBuild} className="btn w-full py-3.5 text-base">
              {building ? 'Building...' : 'BUILD APK'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 ease-smooth ${
        ok ? 'scale-100 bg-black text-white' : 'scale-90 bg-black/10 text-transparent'
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10.5l4 4 8-9" />
      </svg>
    </span>
  );
}
