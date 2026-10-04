'use client';

type Props = { appName: string; sizeMb: string; url: string };

export default function ApkDownloadBubble({ appName, sizeMb, url }: Props) {
  return (
    <div className="w-full min-w-[250px] space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-btn">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10.5l4 4 8-9" />
          </svg>
        </span>
        <p className="text-lg font-bold tracking-tight">BUILD SUCCESSFUL</p>
      </div>
      <div className="space-y-1 rounded-2xl bg-mist p-4 text-sm">
        <p className="break-all font-semibold">{appName}.apk</p>
        <p className="text-black/60">Ukuran {sizeMb} MB</p>
        <p className="text-black/60">Support Android 5 - 14</p>
      </div>
      <a
        href={url}
        download={`${appName}.apk`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn w-full py-4 text-base"
      >
        DOWNLOAD APK
      </a>
    </div>
  );
}
