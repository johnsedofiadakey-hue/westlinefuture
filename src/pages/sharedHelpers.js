import { useState, useEffect } from 'react';

export function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export const isMob = (w) => w <= 1024;
export const LIGHT_BG = `var(--bg-primary)`;
export const DARK_TEXT = `var(--accent-secondary)`;
export const AC = `var(--accent-secondary)`;
