import { Octokit } from '@octokit/rest';
import type { ProjectEntry } from './zipHandler';
import type { IconFile } from './iconResizer';

// Nilai di-inline oleh next.config.js saat build (akses harus statis).
const TOKEN = process.env.GITHUB_TOKEN || '';
const OWNER = process.env.REPO_OWNER || '';
const REPO = process.env.REPO_NAME || '';
const BRANCH = process.env.REPO_BRANCH || 'main';
const WORKFLOW_FILE = 'build.yml';
const BATCH = 6;

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type BuildStep = { name: string; status: StepStatus };
export type ApkInfo = { url: string; sizeMb: string; fileName: string };

export function getConfigStatus() {
  const missing: string[] = [];
  if (!TOKEN) missing.push('GITHUB_TOKEN');
  if (!OWNER) missing.push('REPO_OWNER');
  if (!REPO) missing.push('REPO_NAME');
  return { ok: missing.length === 0, missing, owner: OWNER, repo: REPO, branch: BRANCH };
}

function client() {
  const cfg = getConfigStatus();
  if (!cfg.ok) throw new Error(`Konfigurasi belum lengkap: ${cfg.missing.join(', ')}. Buka halaman /setup.`);
  return new Octokit({ auth: TOKEN });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Push seluruh project + icon sebagai 1 commit ke branch main. */
export async function pushProject(
  entries: ProjectEntry[],
  icons: IconFile[],
  meta: { appName: string; pkg: string },
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const octokit = client();
  const base = { owner: OWNER, repo: REPO };

  const ref = await octokit.git.getRef({ ...base, ref: `heads/${BRANCH}` });
  const parentSha = ref.data.object.sha;
  const parent = await octokit.git.getCommit({ ...base, commit_sha: parentSha });
  const baseTree = await octokit.git.getTree({ ...base, tree_sha: parent.data.tree.sha, recursive: 'true' });

  const map = new Map<string, () => Promise<string>>();
  entries.forEach((e) => map.set(e.path, e.read));
  icons.forEach((i) => map.set(i.path, () => blobToBase64(i.blob))); // icon menimpa file lama
  const list = Array.from(map.entries());

  const tree: { path: string; mode: '100644'; type: 'blob'; sha: string | null }[] = [];
  let done = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const slice = list.slice(i, i + BATCH);
    const created = await Promise.all(
      slice.map(async ([path, read]) => {
        const content = await read();
        const b = await octokit.git.createBlob({ ...base, content, encoding: 'base64' });
        return { path, mode: '100644' as const, type: 'blob' as const, sha: b.data.sha };
      })
    );
    tree.push(...created);
    done += slice.length;
    onProgress?.(done, list.length);
  }

  // Hapus file project lama yang tidak ada di ZIP baru (workflow di .github dilindungi).
  for (const t of baseTree.data.tree) {
    if (t.type === 'blob' && t.path && !map.has(t.path) && !t.path.startsWith('.github/')) {
      tree.push({ path: t.path, mode: '100644', type: 'blob', sha: null });
    }
  }

  const newTree = await octokit.git.createTree({
    ...base,
    base_tree: parent.data.tree.sha,
    tree: tree as any,
  });
  const commit = await octokit.git.createCommit({
    ...base,
    message: `Alyzz build: ${meta.appName} (${meta.pkg}) [skip ci]`,
    tree: newTree.data.sha,
    parents: [parentSha],
  });
  await octokit.git.updateRef({ ...base, ref: `heads/${BRANCH}`, sha: commit.data.sha });
}

/** Trigger workflow_dispatch. Mengembalikan requestId untuk mencocokkan run. */
export async function triggerBuild(appName: string, packageName: string): Promise<string> {
  const octokit = client();
  const requestId = `rq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await octokit.actions.createWorkflowDispatch({
    owner: OWNER,
    repo: REPO,
    workflow_id: WORKFLOW_FILE,
    ref: BRANCH,
    inputs: { appName, packageName, requestId },
  });
  return requestId;
}

function mapStep(s: { name: string; status: string; conclusion: string | null }): BuildStep {
  if (s.status === 'completed') {
    if (s.conclusion === 'success') return { name: s.name, status: 'done' };
    if (s.conclusion === 'skipped') return { name: s.name, status: 'skipped' };
    return { name: s.name, status: 'failed' };
  }
  if (s.status === 'in_progress') return { name: s.name, status: 'running' };
  return { name: s.name, status: 'pending' };
}

async function fetchApk(runNumber: number): Promise<ApkInfo> {
  const octokit = client();
  const tag = `build-${runNumber}`;
  for (let i = 0; i < 8; i++) {
    try {
      const rel = await octokit.repos.getReleaseByTag({ owner: OWNER, repo: REPO, tag });
      const apks = rel.data.assets.filter((a) => a.name.endsWith('.apk'));
      if (apks.length) {
        const pick = apks.find((a) => a.name.includes('arm64-v8a')) || apks[0];
        return {
          url: pick.browser_download_url,
          sizeMb: (pick.size / 1048576).toFixed(1),
          fileName: pick.name,
        };
      }
    } catch {
      /* release belum muncul */
    }
    await sleep(5000);
  }
  throw new Error('Build selesai tetapi APK tidak ditemukan di GitHub Release.');
}

/** Polling status build tiap 5 detik sampai selesai. */
export async function pollBuild(
  requestId: string,
  onUpdate: (steps: BuildStep[], runUrl?: string) => void,
  intervalMs = 5000
): Promise<ApkInfo> {
  const octokit = client();
  const base = { owner: OWNER, repo: REPO };
  let runId: number | null = null;
  let runNumber = 0;

  for (;;) {
    await sleep(intervalMs);

    if (runId === null) {
      const runs = await octokit.actions.listWorkflowRuns({
        ...base,
        workflow_id: WORKFLOW_FILE,
        event: 'workflow_dispatch',
        per_page: 15,
      });
      const found = runs.data.workflow_runs.find((r) => ((r as any).display_title || r.name || '').includes(requestId));
      if (!found) {
        onUpdate([{ name: 'Waiting for GitHub runner', status: 'running' }]);
        continue;
      }
      runId = found.id;
      runNumber = found.run_number;
    }

    const run = await octokit.actions.getWorkflowRun({ ...base, run_id: runId });
    const jobs = await octokit.actions.listJobsForWorkflowRun({ ...base, run_id: runId });
    const job = jobs.data.jobs[0];
    const steps: BuildStep[] = (job?.steps ?? [])
      .filter((s) => !/^(Set up job|Complete job|Post )/.test(s.name))
      .map((s) => mapStep(s));
    onUpdate(steps.length ? steps : [{ name: 'Queued', status: 'running' }], run.data.html_url);

    if (run.data.status === 'completed') {
      if (run.data.conclusion !== 'success') {
        throw new Error(`Build ${run.data.conclusion}. Cek log: ${run.data.html_url}`);
      }
      return fetchApk(runNumber);
    }
  }
}
