'use client';
import type { BuildStep } from '@/lib/github';

const LABEL: Record<BuildStep['status'], string> = {
  pending: 'WAIT',
  running: 'RUN ',
  done: 'DONE',
  failed: 'FAIL',
  skipped: 'SKIP',
};

export default function BuildLogTerminal({ steps, note }: { steps: BuildStep[]; note?: string }) {
  return (
    <div className="border-[3px] border-black bg-mist font-mono text-[12px] leading-relaxed">
      <div className="bg-black text-white px-2 py-1 font-bold tracking-widest">BUILD LOG</div>
      <ul className="p-2 space-y-1">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="font-bold shrink-0">&gt;</span>
            <span className="flex-1 min-w-0 break-words">
              {s.name}
              {s.status === 'running' ? ' ...' : ''}
            </span>
            <span
              className={`shrink-0 px-1 border-2 border-black ${
                s.status === 'done' ? 'bg-black text-white' : s.status === 'failed' ? 'bg-white font-bold underline' : 'bg-white'
              }`}
            >
              {LABEL[s.status]}
            </span>
          </li>
        ))}
      </ul>
      {note && <div className="border-t-[3px] border-black px-2 py-1 break-all">{note}</div>}
    </div>
  );
}
