'use client';
import { ReactNode, useEffect, useState } from 'react';

export function useStream(text: string, enabled: boolean, speed = 15) {
  const [n, setN] = useState(enabled ? 0 : text.length);
  useEffect(() => {
    if (!enabled) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, enabled, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

type Props = {
  role: 'ai' | 'user';
  text?: string;
  stream?: boolean;
  action?: ReactNode; // tampil setelah streaming selesai
  children?: ReactNode;
};

export default function ChatBubble({ role, text = '', stream = false, action, children }: Props) {
  const { shown, done } = useStream(text, stream && role === 'ai', 15);
  const isUser = role === 'user';

  return (
    <div className={`flex gap-2.5 animate-rise ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white shadow-bubble">
          A
        </div>
      )}
      <div className={`flex max-w-[88%] flex-col gap-1 sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="px-1 text-[10px] font-semibold tracking-widest text-black/40">{isUser ? 'KAMU' : 'ALYZZ AI'}</span>
        <div
          className={`break-words px-4 py-3 shadow-bubble ${
            isUser
              ? 'rounded-3xl rounded-tr-lg bg-black text-white'
              : 'rounded-3xl rounded-tl-lg bg-white text-black ring-1 ring-black/5'
          }`}
        >
          {text && (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {shown}
              {stream && !done && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />}
            </p>
          )}
          {children}
          {action && done && <div className="mt-3 animate-rise">{action}</div>}
        </div>
      </div>
    </div>
  );
}
