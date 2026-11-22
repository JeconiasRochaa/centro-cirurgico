import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ROLE_LABELS } from '@/utils/constants';

const initials = (n?: string) => (n ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

/** Usuário logado: fica no canto superior direito, com menu (senha, tema, privacidade, sair). */
export function UserMenu() {
  const { profile, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!profile) return null;
  const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:hover:bg-night-raised';
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left shadow-sm hover:bg-slate-50 dark:border-night-line dark:bg-night-card dark:hover:bg-night-raised">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white dark:bg-teal-700" aria-hidden>{initials(profile.name)}</span>
        <span className="hidden leading-tight sm:block"><span className="block max-w-[11rem] truncate text-sm font-semibold text-slate-800">{profile.name}</span><span className="block text-[11px] text-slate-500">{ROLE_LABELS[profile.role]}</span></span>
        <ChevronDown size={15} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-night-line dark:bg-night-card">
          <div className="border-b border-slate-100 px-3 py-2 dark:border-night-line"><div className="truncate text-sm font-semibold text-slate-800">{profile.name}</div><div className="text-xs text-slate-500">{ROLE_LABELS[profile.role]}</div></div>
          <Link role="menuitem" to="/trocar-senha" className={item} onClick={() => setOpen(false)}><KeyRound size={16} /> Alterar minha senha</Link>
          <button role="menuitem" className={item} onClick={toggle}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Modo claro' : 'Modo noturno'}</button>
          <Link role="menuitem" to="/privacidade" className={item} onClick={() => setOpen(false)}><ShieldCheck size={16} /> Aviso de privacidade</Link>
          <button role="menuitem" className={`${item} text-red-600`} onClick={async () => { await logout(); nav('/login'); }}><LogOut size={16} /> Sair</button>
        </div>
      )}
    </div>
  );
}
