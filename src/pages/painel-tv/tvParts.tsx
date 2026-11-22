import { useEffect, useRef, useState } from 'react';
import { Volume2, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { STATUS_LABELS } from '@/utils/constants';
import type { PainelTVItem, SurgeryStatus } from '@/types';

/** Cores semânticas por status (painéis em azul-marinho). */
export const STATUS_PILL: Record<SurgeryStatus, string> = {
  em_andamento: 'bg-tv-blue/20 text-[#8DB8FF] ring-tv-blue/50',
  em_preparacao: 'bg-violet-400/15 text-violet-300 ring-violet-400/40',
  recuperacao: 'bg-teal-400/15 text-teal-300 ring-teal-400/40',
  pendente: 'bg-tv-orange/15 text-tv-orange ring-tv-orange/40',
  concluida: 'bg-tv-green/15 text-tv-green ring-tv-green/40',
  suspensa: 'bg-tv-red/15 text-tv-red ring-tv-red/40',
  cancelada: 'bg-tv-red/15 text-tv-red ring-tv-red/40'
};

export function StatusPill({ status, className }: { status: SurgeryStatus; className?: string }) {
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset', STATUS_PILL[status] ?? 'bg-slate-500/20 text-slate-200 ring-slate-400/40', className)}>{STATUS_LABELS[status] ?? status}</span>;
}

export type RoomState = 'livre' | 'cirurgia' | 'preparacao' | 'recuperacao';
export const ROOM_STATE_UI: Record<RoomState, { label: string; pill: string; card: string }> = {
  livre: { label: 'Livre', pill: 'bg-tv-green/15 text-tv-green ring-tv-green/40', card: 'border-tv-line' },
  cirurgia: { label: 'Em cirurgia', pill: 'bg-tv-red/15 text-tv-red ring-tv-red/50', card: 'border-tv-red/60 bg-[#2A2236]' },
  preparacao: { label: 'Preparação', pill: 'bg-tv-orange/15 text-tv-orange ring-tv-orange/40', card: 'border-tv-orange/50' },
  recuperacao: { label: 'Recuperação', pill: 'bg-teal-400/15 text-teal-300 ring-teal-400/40', card: 'border-teal-400/40' }
};

/** Estado da sala derivado SOMENTE dos registros do dia (em_andamento > em_preparacao > recuperacao > livre). */
export function roomOverview(todays: PainelTVItem[], sala: string): { state: RoomState; current?: PainelTVItem; next?: PainelTVItem } {
  const mine = todays.filter((s) => s.room === sala);
  const pick = (st: SurgeryStatus) => mine.find((s) => s.status === st);
  const live = pick('em_andamento'), prep = pick('em_preparacao'), rec = pick('recuperacao');
  const next = mine.filter((s) => s.status === 'pendente').sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))[0];
  if (live) return { state: 'cirurgia', current: live, next };
  if (prep) return { state: 'preparacao', current: prep, next };
  if (rec) return { state: 'recuperacao', current: rec, next };
  return { state: 'livre', next };
}

export function longDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

interface HeaderProps {
  logo?: string; hospital: string; subtitle: string; now: Date; online: boolean; seconds?: boolean;
  sound?: { enabled: boolean; enable: () => void };
}
/** Cabeçalho institucional compartilhado pelos painéis de TV e sala de espera. */
export function PanelHeader({ logo, hospital, subtitle, now, online, seconds = true, sound }: HeaderProps) {
  const { logout } = useAuth();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-tv-line bg-tv-bg2 px-5 py-3">
      <div className="flex min-w-0 items-center gap-4">
        {logo && <img src={logo} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1" />}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold uppercase tracking-wide text-tv-text sm:text-2xl 2xl:text-3xl">{hospital}</h1>
          <p className="text-sm font-semibold tracking-[0.14em] text-tv-blue">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono text-4xl font-bold tabular-nums leading-none text-[#8DB8FF] 2xl:text-5xl">{now.toLocaleTimeString('pt-BR', seconds ? undefined : { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="mt-1 text-sm text-tv-mute first-letter:uppercase">{longDate(now)}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span title={online ? 'Conectado ao banco de dados' : 'Sem conexão'} className={cn('flex items-center gap-1.5 text-xs font-semibold', online ? 'text-tv-green' : 'text-tv-red')}>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Online' : 'Offline'}
          </span>
          <div className="flex gap-1.5">
            {sound && <button className="rounded border border-tv-line px-2 py-1 text-xs text-tv-mute hover:text-tv-text" onClick={sound.enable}><Volume2 size={12} className="mr-1 inline" />{sound.enabled ? 'Som ativo' : 'Ativar som'}</button>}
            <button className="rounded border border-tv-line px-2 py-1 text-xs text-tv-mute hover:text-tv-text" onClick={() => void logout()}>Sair</button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function OfflineBanner() {
  return <div role="alert" className="bg-tv-red px-3 py-1.5 text-center text-sm font-bold text-white">Sem conexão — os dados exibidos podem estar desatualizados</div>;
}

/** Ids cujo status mudou desde a última renderização (destaque sutil por alguns segundos). */
export function useChangedIds(items: { id: string; status: string }[], ms = 4000): Set<string> {
  const prev = useRef<Map<string, string> | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  useEffect(() => {
    const cur = new Map(items.map((i) => [i.id, i.status]));
    if (prev.current) {
      const ids = items.filter((i) => prev.current!.has(i.id) && prev.current!.get(i.id) !== i.status).map((i) => i.id);
      if (ids.length) {
        setChanged((c) => new Set([...c, ...ids]));
        window.setTimeout(() => setChanged((c) => { const n = new Set(c); ids.forEach((id) => n.delete(id)); return n; }), ms);
      }
    }
    prev.current = cur;
  }, [items, ms]);
  return changed;
}
