'use client';
import { useEffect } from 'react';

// Fix keyboard mobile: tinggi layar mengikuti visualViewport.
export function useViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => {
      document.documentElement.style.setProperty('--vh', vv.height + 'px');
      window.scrollTo(0, 0);
    };
    apply();
    vv.addEventListener('resize', apply);
    return () => vv.removeEventListener('resize', apply);
  }, []);
}
