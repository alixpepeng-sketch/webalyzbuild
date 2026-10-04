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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className="text-[11px] font-bold tracking-widest">{isUser ? 'USER' : 'ALYZZ AI'}</span>
        <div
          className={`border-[3px] border-black p-3 shadow-brutsm break-words ${
            isUser ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          {text && <p className="whitespace-pre-wrap text-[15px] leading-snug">{shown}</p>}
          {children}
          {action && done && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
