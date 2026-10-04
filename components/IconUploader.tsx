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
    <div>
      <div className="flex items-center gap-3">
        <div className="w-[128px] h-[128px] shrink-0 border-[3px] border-black bg-mist flex items-center justify-center overflow-hidden">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon.previewUrl} width={256} height={256} alt="Preview icon" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-center px-2">PREVIEW 256 x 256</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => inputRef.current?.click()} className="brut-btn w-full py-3 text-sm">
            {loading ? 'MEMPROSES...' : '[ PILIH ICON ]'}
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
          <p className="text-[11px] mt-2 leading-tight">
            {icon
              ? `${icon.srcWidth}x${icon.srcHeight}${icon.cropped ? ' di-crop ke 1:1' : ' sudah 1:1'}. 7 ukuran dibuat (1024 - 48).`
              : 'Gambar apa saja. Otomatis crop persegi 1:1.'}
          </p>
        </div>
      </div>
    </div>
  );
}
