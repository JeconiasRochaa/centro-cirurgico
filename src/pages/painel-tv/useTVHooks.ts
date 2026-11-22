import { useCallback, useEffect, useRef, useState } from 'react';

/** Relógio que atualiza a cada segundo. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const THEME_KEY = 'hrpi_painel_tv_tema';
export type TVTheme = 'light' | 'dark';

function readTheme(): TVTheme {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

export function useTVTheme(): [TVTheme, () => void] {
  const [theme, setTheme] = useState<TVTheme>(readTheme);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: TVTheme = t === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* armazenamento indisponível: segue só em memória */ }
      return next;
    });
  }, []);
  return [theme, toggle];
}

/** Sinal sonoro. O áudio só é liberado após um clique (política dos navegadores). */
export function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);

  const enable = useCallback(() => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = ctxRef.current ?? new Ctor();
      ctxRef.current = ctx;
      void ctx.resume?.();
      setEnabled(true);
    } catch { /* sem suporte a áudio */ }
  }, []);

  const play = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try {
      const tone = (f1: number, f2: number, at: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        const t = ctx.currentTime + at;
        o.frequency.setValueAtTime(f1, t);
        o.frequency.setValueAtTime(f2, t + 0.1);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        o.start(t); o.stop(t + 0.3);
      };
      tone(800, 1000, 0);
      tone(1000, 1200, 0.2);
    } catch { /* falha de áudio não deve afetar o painel */ }
  }, []);

  useEffect(() => () => { try { void ctxRef.current?.close(); } catch { /* ignore */ } }, []);
  return { enabled, enable, play };
}

/** Estado de conexão com o banco. */
export function useOnline(subscribe: (cb: (online: boolean) => void) => () => void): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => subscribe(setOnline), [subscribe]);
  return online;
}
