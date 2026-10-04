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
        className={`cursor-pointer border-[3px] border-dashed border-black p-4 text-center ${
          drag ? 'bg-black text-white' : 'bg-mist'
        }`}
      >
        <p className="font-bold text-sm">{loading ? 'MEMBACA ZIP...' : 'DRAG DROP ZIP PROJECT FLUTTER'}</p>
        <p className="text-xs mt-1">atau klik untuk memilih file .zip</p>
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
        <p className="mt-2 text-xs font-bold break-all">
          {parsed.name} : {parsed.paths.length} file
        </p>
      )}
    </div>
  );
}
