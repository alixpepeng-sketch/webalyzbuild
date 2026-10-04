'use client';
import { useRef, useState } from 'react';
import { prepareIcon, IconResult } from '@/lib/iconResizer';

type Props = {
  icon: IconResult | null;
  onReady: (i: IconResult) => void;
  onError: (msg: string) => void;
};

export default function IconUploader({ icon, onReady, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handle(file?: File | null) {
    if (!file) return;
    setLoading(true);
    try {
      onReady(await prepareIcon(file));
    } catch (e: any) {
      onError(e?.message || 'Gagal memproses icon');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[112px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-mist shadow-soft ring-1 ring-black/5">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon.previewUrl} width={256} height={256} alt="Preview icon" className="h-full w-full animate-rise object-cover" />
        ) : (
          <span className="px-2 text-center text-[11px] font-semibold text-black/40">Preview 256 x 256</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn w-full py-3 text-sm">
          {loading ? 'Memproses...' : 'Pilih Icon'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p className="mt-2 text-[11px] leading-snug text-black/50">
          {icon
            ? `${icon.srcWidth}x${icon.srcHeight}${icon.cropped ? ' di-crop ke 1:1' : ' sudah 1:1'}. 7 ukuran dibuat (1024 - 48).`
            : 'Gambar apa saja. Otomatis crop persegi 1:1.'}
        </p>
      </div>
    </div>
  );
}
