'use client';
import Link from 'next/link';
import { useViewportFix } from '@/lib/useViewportFix';
import { getConfigStatus } from '@/lib/github';

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre rounded-2xl bg-black p-4 font-mono text-[12px] leading-relaxed text-white">{children}</pre>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-rise space-y-3 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      <h2 className="font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function SetupPage() {
  useViewportFix();
  const cfg = getConfigStatus();

  return (
    <div className="overflow-y-auto" style={{ height: 'var(--vh, 100dvh)' }}>
      <header className="sticky top-3 z-10 m-3 flex h-[60px] items-center justify-between rounded-3xl bg-white/80 px-4 shadow-soft ring-1 ring-black/5 backdrop-blur-xl">
        <h1 className="text-[15px] font-bold tracking-tight sm:text-lg">ALYZZ AI • SETUP</h1>
        <Link href="/" className="btn px-4 py-2 text-sm">
          Kembali
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-3 pb-10">
        <Card title="Status konfigurasi">
          <ul className="space-y-1.5 text-sm">
            <li>GITHUB_TOKEN : <b>{cfg.missing.includes('GITHUB_TOKEN') ? 'BELUM DIISI' : 'TERISI'}</b></li>
            <li>REPO_OWNER : <b>{cfg.owner || 'BELUM DIISI'}</b></li>
            <li>REPO_NAME : <b>{cfg.repo || 'BELUM DIISI'}</b></li>
            <li>REPO_BRANCH : <b>{cfg.branch}</b></li>
          </ul>
        </Card>

        <Card title="1. Buat repo engine">
          <p className="text-sm text-black/70">
            Buat repo GitHub baru (misal <b>alyzz-engine</b>), lalu push isi folder <b>/engine</b> dari ZIP ke branch <b>main</b> (cukup 1 kali).
            File workflow harus ada di <b>.github/workflows/build.yml</b>.
          </p>
        </Card>

        <Card title="2. Buat GitHub token">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-black/70">
            <li>GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens &gt; Fine-grained tokens.</li>
            <li>Generate new token. Repository access: Only select repositories, pilih repo engine.</li>
            <li>Repository permissions: Contents = Read and write, Actions = Read and write, Metadata = Read.</li>
            <li>Salin token (diawali github_pat_).</li>
          </ol>
        </Card>

        <Card title="3. Isi .env.local">
          <p className="text-sm text-black/70">Di root folder web, buat file <b>.env.local</b>:</p>
          <Code>{`GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
REPO_OWNER=username-github-kamu
REPO_NAME=alyzz-engine
REPO_BRANCH=main`}</Code>
          <p className="text-sm text-black/70">Jalankan ulang <b>npm run dev</b> setelah mengubah file ini.</p>
        </Card>

        <Card title="4. Deploy Vercel">
          <p className="text-sm text-black/70">
            Di Vercel buka Project Settings &gt; Environment Variables, isi 4 variabel yang sama, lalu Redeploy. Variabel di-inline saat build.
          </p>
        </Card>

        <Card title="Peringatan keamanan">
          <p className="text-sm text-black/70">
            Push ke GitHub dilakukan langsung dari browser, sehingga token ikut tertanam di bundle frontend dan bisa dilihat siapa pun yang membuka web.
            Gunakan fine-grained token yang hanya untuk 1 repo engine, aktifkan Vercel Password Protection, dan jangan bagikan URL web ke publik.
          </p>
        </Card>
      </main>
    </div>
  );
}
