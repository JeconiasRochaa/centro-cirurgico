import { useEffect, useMemo, useRef } from 'react';
import { CalendarClock } from 'lucide-react';
import { ErrorState, Spinner } from '@/components/common';
import { useIdentity } from '@/hooks/useIdentity';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeConnection, subscribePainelTV } from '@/services/database/others';
import { SALAS } from '@/utils/constants';
import { doctorTitle, formatDate, procedureNames, todayISO } from '@/utils/format';
import type { PainelTVItem } from '@/types';
import { cn } from '@/utils/cn';
import { clinicaSigla, countStatuses, dueForNotice, origemCurta, sortForTV, upcoming, yesNoLabel } from './tvLogic';
import { useBeep, useNow, useOnline } from './useTVHooks';
import { OfflineBanner, PanelHeader, ROOM_STATE_UI, StatusPill, roomOverview, useChangedIds } from './tvParts';

const TH = 'sticky top-0 z-10 bg-tv-card px-3 py-3 text-xs font-bold uppercase tracking-wider text-tv-blue';

function YesNo({ v }: { v?: string }) {
  const { label, yes } = yesNoLabel(v);
  return <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-bold', yes ? 'bg-tv-red/20 text-tv-red' : v === 'talvez' ? 'bg-tv-orange/20 text-tv-orange' : 'bg-tv-green/15 text-tv-green')}>{label}</span>;
}

/** Painel da TV. Conta de exibição: lê SOMENTE o espelho minimizado `painel_tv` (sem prontuário, CPF, contato etc.). */
export default function PainelTVPage() {
  const identity = useIdentity();
  const now = useNow(1000);
  const today = todayISO(now);
  const online = useOnline(subscribeConnection);
  const beep = useBeep();
  const { data, loading, error } = useSubscription<PainelTVItem[]>((cb, err) => subscribePainelTV(cb, err), []);

  const todays = useMemo(() => sortForTV(data.filter((s) => s.date === today)), [data, today]);
  const counts = useMemo(() => countStatuses(todays), [todays]);
  const next = useMemo(() => upcoming(data, today).slice(0, 10), [data, today]);
  const changed = useChangedIds(todays);
  const warned = useRef(new Set<string>());
  const minute = Math.floor(now.getTime() / 60000);
  useEffect(() => {
    const due = dueForNotice(data, today, now).filter((s) => !warned.current.has(s.id));
    if (due.length) { due.forEach((s) => warned.current.add(s.id)); beep.play(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minute, data, today]);

  const kpis = [
    { l: 'Em andamento', v: counts.andamento, c: 'text-[#8DB8FF]' },
    { l: 'Finalizados', v: counts.finalizadas, c: 'text-tv-green' },
    { l: 'Aguardando', v: counts.aguardando, c: 'text-tv-orange' },
    { l: 'Canceladas/Suspensas', v: counts.canceladas, c: 'text-tv-red' }
  ];

  return (
    <div className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-tv-bg text-tv-text">
      <PanelHeader logo={identity.logo} hospital={identity.hospitalName} subtitle="HRPI • Centro Cirúrgico" now={now} online={online} sound={beep} />
      {!online && <OfflineBanner />}

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-px border-b border-tv-line bg-tv-line md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="bg-tv-bg2 py-2 text-center">
            <div key={k.v} className={cn('animate-kpi font-mono text-4xl font-bold tabular-nums leading-none 2xl:text-5xl', k.c)}>{String(k.v).padStart(2, '0')}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-tv-mute">{k.l}</div>
          </div>
        ))}
      </section>

      <section aria-label="Monitoramento das salas cirúrgicas" className="px-4 pt-3">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-tv-mute">Monitoramento das salas cirúrgicas</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {SALAS.map((sala) => {
            const { state, current, next: nx } = roomOverview(todays, sala);
            const ui = ROOM_STATE_UI[state];
            return (
              <div key={sala} className={cn('rounded-xl border bg-tv-card p-3 transition-colors duration-500', ui.card, current && changed.has(current.id) && 'ring-2 ring-tv-blue')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-extrabold">{sala}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset', ui.pill)}>{ui.label}</span>
                </div>
                {current ? (
                  <div className="mt-2 min-w-0 text-sm">
                    <div className="truncate text-base font-bold">{current.patient}</div>
                    <div className="truncate text-tv-mute">{procedureNames(current.type).join(', ') || '-'}</div>
                    {current.time && <div className="mt-0.5 text-xs font-semibold text-[#8DB8FF]">Horário: {current.time}</div>}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-tv-mute">
                    Sem cirurgia no momento
                    {nx && <div className="mt-0.5 truncate text-xs text-tv-orange">Próxima: {nx.time ?? '--:--'} · {nx.patient}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {loading ? <div className="flex flex-1 items-center justify-center"><Spinner /></div> : error ? <div className="p-4"><ErrorState message={error} /></div> : (
        <div className="grid min-h-0 flex-1 gap-3 p-4 xl:grid-cols-[1fr_18rem]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-tv-line bg-tv-bg2" aria-label="Cirurgias de hoje">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-[15px] 2xl:text-base">
                <thead><tr>
                  {['Hora', 'Sala', 'Paciente', 'Idade', 'Origem', 'Procedimento', 'Cirurgião', 'Instrumentador(a)', 'Anestesista', 'Sangue', 'UTI', 'Status'].map((h) => <th key={h} className={TH}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {todays.length === 0 && <tr><td colSpan={12} className="p-10 text-center text-lg text-tv-mute">Nenhuma cirurgia programada para hoje.</td></tr>}
                  {todays.map((s) => (
                    <tr key={s.id} className={cn('border-t border-tv-line align-top transition-colors duration-700', s.status === 'em_andamento' && 'bg-tv-blue/10 shadow-[inset_4px_0_0_#3985FF]', changed.has(s.id) && 'bg-tv-blue/25')}>
                      <td className="whitespace-nowrap px-3 py-3 font-bold tabular-nums">{s.time ?? '-'}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-bold">{s.room ?? '-'}</td>
                      <td className="px-3 py-3 font-semibold">{s.patient}</td>
                      <td className="px-3 py-3 tabular-nums">{s.age ?? '-'}</td>
                      <td className="px-3 py-3 text-sm">{origemCurta(s.origem)}{s.clinicaOrigem ? <div className="text-xs text-tv-mute">{clinicaSigla(s.clinicaOrigem)}</div> : null}</td>
                      <td className="max-w-[22rem] px-3 py-3">{procedureNames(s.type).join(', ') || '-'}</td>
                      <td className="px-3 py-3">{s.doctor ? <><div className="font-bold">{doctorTitle(s.doctor)} {s.doctor}</div>{s.specialty && <div className="mt-0.5 inline-block rounded bg-tv-blue/20 px-1.5 text-[11px] font-semibold text-[#8DB8FF]">{s.specialty}</div>}</> : '-'}</td>
                      <td className="px-3 py-3">{s.instrumentador || '-'}</td>
                      <td className="px-3 py-3">{s.anesthetist ? <div className="font-bold">{doctorTitle(s.anesthetist)} {s.anesthetist}</div> : '-'}</td>
                      <td className="px-3 py-3"><YesNo v={s.necessitaSangue} /></td>
                      <td className="px-3 py-3"><YesNo v={s.necessitaUTI} /></td>
                      <td className="px-3 py-3"><StatusPill status={s.status} /></td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </section>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-tv-line bg-tv-bg2" aria-label="Próximas cirurgias">
            <h2 className="flex items-center gap-2 border-b border-tv-line bg-tv-card px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-tv-blue"><CalendarClock size={16} /> Próximas cirurgias</h2>
            {next.length === 0 ? <p className="p-4 text-sm text-tv-mute">Não há procedimentos programados para os próximos dias.</p> : (
              <ul className="min-h-0 flex-1 divide-y divide-tv-line overflow-auto">
                {next.map((s) => (
                  <li key={s.id} className="px-4 py-2.5 text-sm">
                    <div className="font-bold text-[#8DB8FF]">{formatDate(s.date)}{s.time ? ` · ${s.time}` : ''}{s.room ? ` · ${s.room}` : ''}</div>
                    <div className="font-semibold">{s.patient}</div>
                    <div className="truncate text-xs text-tv-mute" title={procedureNames(s.type).join(', ')}>{procedureNames(s.type).join(', ')}</div>
                  </li>))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
