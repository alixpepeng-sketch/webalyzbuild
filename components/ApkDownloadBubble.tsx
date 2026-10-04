'use client';

type Props = { appName: string; sizeMb: string; url: string };

export default function ApkDownloadBubble({ appName, sizeMb, url }: Props) {
  return (
    <div className="w-full min-w-[240px] space-y-3">
      <p className="text-lg font-bold tracking-tight">BUILD SUCCESSFUL</p>
      <div className="border-[3px] border-black bg-mist p-3 space-y-1 text-sm">
        <p className="font-bold break-all">{appName}.apk</p>
        <p>Ukuran : {sizeMb} MB</p>
        <p>Support Android 5 - 14</p>
      </div>
      <a
        href={url}
        download={`${appName}.apk`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-black text-white text-center font-bold text-base py-4 border-[3px] border-black shadow-[4px_4px_0px_#000] transition-transform active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
      >
        [ DOWNLOAD APK ]
      </a>
    </div>
  );
}
