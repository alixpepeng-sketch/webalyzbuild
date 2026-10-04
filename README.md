# ALYZZ AI - Web Builder

Next.js 14 (App Router) + TypeScript + Tailwind. Chat operator build APK Flutter lewat GitHub Actions.

## Alur

1. Isi App Name, Package Name (bebas, huruf kecil), Icon (otomatis crop 1:1 dan resize 1024/512/192/144/96/72/48), dan upload ZIP project Flutter.
2. Tekan BUILD APK. Browser mem-push project + icon ke repo engine (1 commit, branch main, `[skip ci]`), lalu memicu `workflow_dispatch`.
3. Status build di-polling tiap 5 detik. Saat selesai, tombol DOWNLOAD APK muncul di chat (link GitHub Release). URL disimpan di localStorage.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi GITHUB_TOKEN, REPO_OWNER, REPO_NAME
npm run dev
```

Buka http://localhost:3000 dan http://localhost:3000/setup

## Deploy ke Vercel

1. Push folder `web` ini ke repo GitHub (atau import sebagai root directory `web`).
2. Vercel > Add New Project > pilih repo. Framework otomatis Next.js.
3. Environment Variables: `GITHUB_TOKEN`, `REPO_OWNER`, `REPO_NAME`, `REPO_BRANCH` (opsional, default main).
4. Deploy. Jika mengubah env, lakukan Redeploy (nilai di-inline saat build).

## Catatan keamanan

Karena push dilakukan dari browser, token terlihat di bundle frontend. Pakai fine-grained token khusus 1 repo engine
(Contents: read/write, Actions: read/write), dan aktifkan Vercel Password Protection.

## Catatan teknis

- Folder `.github/` di dalam ZIP user diabaikan agar workflow engine tidak tertimpa.
- File project lama di repo (selain `.github/`) dihapus otomatis tiap build supaya tidak tercampur.
- Release APK memakai split per ABI; tombol download memilih `arm64-v8a`.
