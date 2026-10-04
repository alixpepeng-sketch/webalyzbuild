'use client';
import Link from 'next/link';
import { useViewportFix } from '@/lib/useViewportFix';
import { getConfigStatus } from '@/lib/github';

function Code({ children }: { children: string }) {
  return (
    <pre className="border-[3px] border-black bg-mist p-3 text-[12px] overflow-x-auto font-mono whitespace-pre">{children}</pre>
  );
}

export default function SetupPage() {
  useViewportFix();
  const cfg = getConfigStatus();

  return (
    <div className="bg-mist overflow-y-auto" style={{ height: 'var(--vh, 100dvh)' }}>
      <header className="h-[60px] border-b-[3px] border-black bg-white flex items-center justify-between px-4 sticky top-0 z-10">
        <h1 className="font-bold tracking-tight text-[15px] sm:text-lg">ALYZZ AI • SETUP</h1>
        <Link href="/" className="brut-btn px-3 py-1.5 text-sm">
          [ KEMBALI ]
        </Link>
      </header>

      <main className="mx-auto max-w-2xl p-4 space-y-6">
        <section className="brut p-4">
          <h2 className="font-bold mb-2">STATUS KONFIGURASI</h2>
          <ul className="text-sm space-y-1">
            <li>GITHUB_TOKEN : <b>{cfg.missing.includes('GITHUB_TOKEN') ? 'BELUM DIISI' : 'TERISI'}</b></li>
            <li>REPO_OWNER : <b>{cfg.owner || 'BELUM DIISI'}</b></li>
            <li>REPO_NAME : <b>{cfg.repo || 'BELUM DIISI'}</b></li>
            <li>REPO_BRANCH : <b>{cfg.branch}</b></li>
          </ul>
        </section>

        <section className="brut p-4 space-y-3">
          <h2 className="font-bold">1. BUAT REPO ENGINE</h2>
          <p className="text-sm">
            Buat repo GitHub baru (misal <b>alyzz-engine</b>), lalu push isi folder <b>/engine</b> dari ZIP ke branch <b>main</b> (cukup 1 kali).
            File workflow harus ada di <b>.github/workflows/build.yml</b>.
          </p>
        </section>

        <section className="brut p-4 space-y-3">
          <h2 className="font-bold">2. BUAT GITHUB TOKEN</h2>
          <ol className="list-decimal pl-5 text-sm space-y-1">
            <li>GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens &gt; Fine-grained tokens.</li>
            <li>Generate new token. Repository access: Only select repositories, pilih repo engine.</li>
            <li>Repository permissions: Contents = Read and write, Actions = Read and write, Metadata = Read.</li>
            <li>Salin token (diawali github_pat_).</li>
          </ol>
        </section>

        <section className="brut p-4 space-y-3">
          <h2 className="font-bold">3. ISI .env.local</h2>
          <p className="text-sm">Di root folder web, buat file <b>.env.local</b>:</p>
          <Code>{`GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
REPO_OWNER=username-github-kamu
REPO_NAME=alyzz-engine
REPO_BRANCH=main`}</Code>
          <p className="text-sm">Jalankan ulang <b>npm run dev</b> setelah mengubah file ini.</p>
        </section>

        <section className="brut p-4 space-y-3">
          <h2 className="font-bold">4. DEPLOY VERCEL</h2>
          <p className="text-sm">
            Di Vercel buka Project Settings &gt; Environment Variables, isi 4 variabel yang sama, lalu Redeploy. Variabel di-inline saat build.
          </p>
        </section>

        <section className="brut p-4 space-y-2">
          <h2 className="font-bold">PERINGATAN KEAMANAN</h2>
          <p className="text-sm">
            Push ke GitHub dilakukan langsung dari browser, sehingga token ikut tertanam di bundle frontend dan bisa dilihat siapa pun yang membuka web.
            Gunakan fine-grained token yang hanya untuk 1 repo engine, aktifkan Vercel Password Protection, dan jangan bagikan URL web ke publik.
          </p>
        </section>
      </main>
    </div>
  );
}
