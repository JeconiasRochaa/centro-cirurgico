import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, Armchair, BarChart3, Building2, CalendarPlus, CalendarX, ChevronDown, ClipboardList, ExternalLink, FileText, Home, LayoutDashboard, LineChart,
  Menu, Receipt, Scale, Settings, ShieldCheck, Stethoscope, Tv, Users, X, ListChecks, Shield, MonitorPlay, type LucideIcon
} from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentity } from '@/hooks/useIdentity';
import { useMirrorSync } from '@/hooks/useMirrorSync';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserMenu } from '@/components/common/UserMenu';
import type { Feature } from '@/utils/permissions';

interface Leaf { to: string; label: string; icon: LucideIcon; feature: Feature; newTab?: boolean; end?: boolean }
type Entry = (Leaf & { children?: undefined }) | { key: string; label: string; icon: LucideIcon; children: Leaf[]; to?: undefined };

/** Menu com grupos que abrem/fecham (sanfona): cada assunto concentrado no seu grupo. */
const MENU: Entry[] = [
  { to: '/home', label: 'Início', icon: Home, feature: 'home' },
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, feature: 'dashboard' },
  { key: 'cirurgias', label: 'Cirurgias', icon: Stethoscope, children: [
    { to: '/cirurgias/nova', label: 'Agendar cirurgia', icon: CalendarPlus, feature: 'cirurgias.registrar' },
    { to: '/cirurgias/andamento', label: 'Andamento', icon: Activity, feature: 'cirurgias.status' },
    { to: '/cirurgias', label: 'Todas as cirurgias', icon: ListChecks, feature: 'cirurgias.ver', end: true },
    { to: '/clinicas', label: 'Solicitações', icon: Building2, feature: 'clinicas' },
    { to: '/pacientes', label: 'Prontuários', icon: ClipboardList, feature: 'pacientes.ver' },
    { to: '/faltas', label: 'Faltas', icon: CalendarX, feature: 'faltas.ver' }
  ] },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3, children: [
    { to: '/indicadores', label: 'Indicadores', icon: LineChart, feature: 'relatorios' },
    { to: '/relatorios', label: 'Relatórios', icon: FileText, feature: 'relatorios' },
    { to: '/faturamento', label: 'Faturamento', icon: Receipt, feature: 'relatorios' }
  ] },
  { key: 'admin', label: 'Administração', icon: Shield, children: [
    { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck, feature: 'auditoria' },
    { to: '/lgpd', label: 'LGPD / Titulares', icon: Scale, feature: 'lgpd' },
    { to: '/usuarios', label: 'Usuários', icon: Users, feature: 'usuarios' },
    { to: '/configuracoes', label: 'Configurações', icon: Settings, feature: 'configuracoes' }
  ] },
  { key: 'paineis', label: 'Painéis', icon: MonitorPlay, children: [
    { to: '/painel-tv', label: 'Painel TV', icon: Tv, feature: 'painel_tv', newTab: true },
    { to: '/painel-espera', label: 'Sala de espera', icon: Armchair, feature: 'painel_espera', newTab: true }
  ] }
];

/** Abre em nova aba SEM "noopener": a sessão (por aba) é copiada para a nova aba; depois remove o vínculo com esta aba. */
function openInNewTab(path: string) { const w = window.open(path, '_blank'); if (w) w.opener = null; }

const row = 'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition';
const idle = 'text-slate-300 hover:bg-white/10 hover:text-white';

export default function AppLayout() {
  const { can } = useAuth();
  const identity = useIdentity();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useMirrorSync();

  const entries = MENU.map((e) => (e.children ? { ...e, children: e.children.filter((c) => can(c.feature)) } : e))
    .filter((e) => (e.children ? e.children.length > 0 : can((e as Leaf).feature)));

  // Abre automaticamente o grupo da página atual.
  useEffect(() => {
    for (const e of entries) {
      if (e.children?.some((c) => !c.newTab && (c.end ? loc.pathname === c.to : loc.pathname.startsWith(c.to)))) {
        setExpanded((p) => (p.has(e.key) ? p : new Set(p).add(e.key)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  const toggle = (k: string) => setExpanded((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const leaf = (l: Leaf, nested = false) => l.newTab ? (
    <button type="button" onClick={() => { openInNewTab(l.to); setOpen(false); }} className={clsx(row, idle, nested && 'py-1.5')} title="Abre em uma nova aba">
      <l.icon size={17} className="text-slate-400 group-hover:text-teal" /><span className="flex-1 text-left">{l.label}</span><ExternalLink size={13} className="text-white/40" aria-label="Abre em nova aba" />
    </button>
  ) : (
    <NavLink to={l.to} end={l.end} onClick={() => setOpen(false)} className={({ isActive }) => clsx(row, nested && 'py-1.5', isActive ? 'bg-white/12 font-semibold text-white' : idle)}>
      {({ isActive }) => (<>
        {isActive && !nested && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-teal" aria-hidden />}
        <l.icon size={17} className={isActive ? 'text-teal' : 'text-slate-400 group-hover:text-teal'} />{l.label}
      </>)}
    </NavLink>
  );

  const sidebar = (
    <nav aria-label="Menu principal" className="flex h-full flex-col border-r border-black/10 bg-gradient-to-b from-[#0A2A40] to-[#0B3248] text-slate-200 dark:border-night-line dark:from-[#16191d] dark:to-[#16191d]">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        {identity.logo ? <img src={identity.logo} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal/15 text-teal"><FileText size={22} /></div>}
        <div className="min-w-0 leading-tight"><div className="truncate font-bold tracking-tight text-white">{identity.systemName}</div><div className="text-[11px] uppercase tracking-wider text-white/50">Centro Cirúrgico</div></div>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {entries.map((e) => (
          <li key={e.children ? e.key : e.to}>
            {e.children ? (
              <>
                <button type="button" aria-expanded={expanded.has(e.key)} aria-controls={`grp-${e.key}`} onClick={() => toggle(e.key)} className={clsx(row, idle)}>
                  <e.icon size={18} className="text-slate-400 group-hover:text-teal" /><span className="flex-1 text-left">{e.label}</span>
                  <ChevronDown size={15} className={clsx('text-slate-400 transition-transform duration-200', expanded.has(e.key) && 'rotate-180')} aria-hidden />
                </button>
                <div id={`grp-${e.key}`} className={clsx('grid transition-[grid-template-rows] duration-200', expanded.has(e.key) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <ul className="ml-5 min-h-0 space-y-0.5 overflow-hidden border-l border-white/15 pl-2" {...(!expanded.has(e.key) ? ({ inert: '' } as Record<string, string>) : {})}>
                    {e.children.map((c) => <li key={c.to} className="first:mt-1">{leaf(c, true)}</li>)}
                  </ul>
                </div>
              </>
            ) : leaf(e as Leaf)}
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 md:block"><div className="fixed inset-y-0 w-64">{sidebar}</div></aside>
      {open && <div className="fixed inset-0 z-40 md:hidden"><div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</div></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-surface/90 px-4 py-2 backdrop-blur dark:border-night-line dark:bg-night/90">
          <div className="flex min-w-0 items-center gap-2">
            <button className="rounded p-2 text-slate-600 hover:bg-slate-200/60 md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen((v) => !v)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
            <div className="hidden truncate text-sm font-medium text-slate-500 md:block">{identity.hospitalName}</div>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle className="btn-secondary btn-sm !rounded-full !p-2" /><UserMenu /></div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-4 md:px-6 lg:px-8"><Suspense fallback={<div className="py-16"><Spinner /></div>}><Outlet /></Suspense></main>
      </div>
    </div>
  );
}
