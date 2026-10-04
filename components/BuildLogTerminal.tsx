'use client';
import type { BuildStep } from '@/lib/github';

function Indicator({ status }: { status: BuildStep['status'] }) {
  if (status === 'running')
    return <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />;
  if (status === 'done')
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-black">
        <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10.5l4 4 8-9" />
        </svg>
      </span>
    );
  if (status === 'failed')
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-black">
        <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </span>
    );
  return <span className="block h-2 w-2 rounded-full bg-white/30" />;
}

export default function BuildLogTerminal({ steps, note }: { steps: BuildStep[]; note?: string }) {
  const done = steps.filter((s) => s.status === 'done').length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-2xl bg-black font-mono text-[12px] leading-relaxed text-white shadow-bubble">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="font-semibold tracking-widest text-white/70">BUILD LOG</span>
        <span className="text-white/50">{pct}%</span>
      </div>
      <div className="mx-4 h-1 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white transition-all duration-700 ease-smooth" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2 px-4 py-3">
        {steps.map((s, i) => (
          <li key={i} className="flex animate-rise items-start gap-3">
            <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
              <Indicator status={s.status} />
            </span>
            <span className={`min-w-0 flex-1 break-words ${s.status === 'pending' || s.status === 'skipped' ? 'text-white/40' : ''}`}>
              {s.name}
            </span>
          </li>
        ))}
      </ul>
      {note && <div className="break-all border-t border-white/10 px-4 py-2 text-white/50">{note}</div>}
    </div>
  );
}
