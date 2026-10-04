import JSZip from 'jszip';

export type ProjectEntry = { path: string; read: () => Promise<string> };
export type ParsedZip = {
  id: string;
  name: string;
  sizeBytes: number;
  paths: string[];
  entries: ProjectEntry[];
};

const IGNORE_PREFIX = [
  'build/',
  '.dart_tool/',
  '.github/',
  '.git/',
  '.idea/',
  '.gradle/',
  'android/.gradle/',
  'android/build/',
  'android/app/build/',
];
const IGNORE_ANYWHERE = ['__MACOSX/', '/.git/', 'node_modules/'];
const IGNORE_FILES = ['.DS_Store', 'local.properties', '.flutter-plugins', '.flutter-plugins-dependencies'];

function isIgnored(p: string): boolean {
  if (IGNORE_PREFIX.some((d) => p.startsWith(d))) return true;
  if (IGNORE_ANYWHERE.some((d) => p.includes(d))) return true;
  const base = p.split('/').pop() || '';
  return IGNORE_FILES.includes(base) || base.endsWith('.iml');
}

export async function parseProjectZip(file: File): Promise<ParsedZip> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('File harus berformat .zip');
  }
  const zip = await JSZip.loadAsync(file);
  const files = Object.values(zip.files).filter((f) => !f.dir);

  const pubspecs = files
    .map((f) => f.name)
    .filter((n) => !n.includes('__MACOSX/') && (n === 'pubspec.yaml' || n.endsWith('/pubspec.yaml')))
    .sort((a, b) => a.length - b.length);

  if (pubspecs.length === 0) {
    throw new Error('pubspec.yaml tidak ditemukan. Pastikan ZIP adalah project Flutter.');
  }
  const prefix = pubspecs[0].slice(0, pubspecs[0].length - 'pubspec.yaml'.length);

  const entries: ProjectEntry[] = [];
  for (const f of files) {
    if (!f.name.startsWith(prefix)) continue;
    const path = f.name.slice(prefix.length);
    if (!path || isIgnored(path)) continue;
    entries.push({ path, read: () => f.async('base64') });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    sizeBytes: file.size,
    paths: entries.map((e) => e.path),
    entries,
  };
}
