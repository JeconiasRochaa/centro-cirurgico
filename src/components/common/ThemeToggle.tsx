import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle({ className = 'btn-secondary btn-sm', label = false }: { className?: string; label?: boolean }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button type="button" onClick={toggle} className={className} aria-pressed={dark} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo noturno'} title={dark ? 'Modo claro' : 'Modo noturno'}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}{label && <span>{dark ? 'Modo claro' : 'Modo noturno'}</span>}
    </button>
  );
}
