import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'hrpi_theme';
const listeners = new Set<() => void>();
let current: Theme = 'light';

function read(): Theme {
  try { const v = localStorage.getItem(KEY); if (v === 'dark' || v === 'light') return v; } catch { /* armazenamento indisponível */ }
  try { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; }
}
function apply() {
  document.documentElement.classList.toggle('dark', current === 'dark');
  document.documentElement.style.colorScheme = current;
}
/** Chamar uma vez na inicialização (antes de renderizar) para evitar "piscar" de tema. */
export function initTheme() { current = read(); apply(); }
export function setTheme(t: Theme) {
  current = t;
  try { localStorage.setItem(KEY, t); } catch { /* segue só em memória */ }
  apply();
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light' as Theme);
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
