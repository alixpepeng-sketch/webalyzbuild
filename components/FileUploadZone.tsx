'use client';
import { useRef, useState } from 'react';
import { parseProjectZip, ParsedZip } from '@/lib/zipHandler';

type Props = {
  parsed: ParsedZip | null;
  onParsed: (z: ParsedZip) => void;
  onError: (msg: string) => void;
};

export default function FileUploadZone({ parsed, onParsed, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handle(file?: File | null) {
    if (!file) return;
    setLoading(true);
    try {
      onParsed(await parseProjectZip(file));
    } catch (e: any) {
      onError(e?.message || 'Gagal membaca ZIP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-5 text-center transition-all duration-300 ease-smooth active:scale-[0.98] ${
          drag ? 'scale-[1.02] border-black bg-black text-white' : 'border-black/20 bg-mist hover:border-black/60'
        }`}
      >
        <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <p className="text-sm font-semibold">{loading ? 'Membaca ZIP...' : 'Drag drop ZIP project Flutter'}</p>
        <p className="mt-0.5 text-xs opacity-60">atau ketuk untuk memilih file .zip</p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {parsed && (
        <div className="mt-2 animate-rise rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
          <span className="break-all">
            {parsed.name} &bull; {parsed.paths.length} file
          </span>
        </div>
      )}
    </div>
  );
}
