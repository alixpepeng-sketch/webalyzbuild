import imageCompression from 'browser-image-compression';

export type IconFile = { path: string; size: number; blob: Blob };
export type IconResult = {
  id: string;
  previewUrl: string;
  srcWidth: number;
  srcHeight: number;
  cropped: boolean;
  files: IconFile[];
};

const RES = 'android/app/src/main/res';
export const ICON_TARGETS: { size: number; path: string }[] = [
  { size: 1024, path: 'alyz_icons/icon-1024.png' },
  { size: 512, path: 'alyz_icons/icon-512.png' },
  { size: 192, path: `${RES}/mipmap-xxxhdpi/ic_launcher.png` },
  { size: 144, path: `${RES}/mipmap-xxhdpi/ic_launcher.png` },
  { size: 96, path: `${RES}/mipmap-xhdpi/ic_launcher.png` },
  { size: 72, path: `${RES}/mipmap-hdpi/ic_launcher.png` },
  { size: 48, path: `${RES}/mipmap-mdpi/ic_launcher.png` },
];

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak bisa dibaca'));
    };
    img.src = url;
  });
}

function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat PNG'))), 'image/png')
  );
}

function drawScaled(src: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(src, 0, 0, size, size);
  return c;
}

export async function prepareIcon(file: File): Promise<IconResult> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar');

  let source: Blob = file;
  try {
    source = await imageCompression(file, { maxWidthOrHeight: 2048, useWebWorker: true });
  } catch {
    source = file;
  }

  const img = await loadImage(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const side = Math.min(w, h);
  const cropped = Math.abs(w - h) > 1;

  // Crop tengah ke persegi 1:1
  const square = document.createElement('canvas');
  square.width = side;
  square.height = side;
  square.getContext('2d')!.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, side, side);

  const files: IconFile[] = [];
  for (const t of ICON_TARGETS) {
    files.push({ path: t.path, size: t.size, blob: await canvasToBlob(drawScaled(square, t.size)) });
  }

  const previewUrl = drawScaled(square, 256).toDataURL('image/png');
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    previewUrl,
    srcWidth: w,
    srcHeight: h,
    cropped,
    files,
  };
}
