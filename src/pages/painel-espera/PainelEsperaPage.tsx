import { useMemo } from 'react';
import { ErrorState, Spinner } from '@/components/common';
import { useIdentity } from '@/hooks/useIdentity';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeConnection, subscribePainelEspera } from '@/services/database/others';
import { todayISO } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PainelEsperaItem, SurgeryStatus } from '@/types';
import { useNow, useOnline } from '../painel-tv/useTVHooks';
import { OfflineBanner, PanelHeader, StatusPill, useChangedIds } from '../painel-tv/tvParts';

const ORDER: SurgeryStatus[] = ['em_andamento', 'em_preparacao', 'recuperacao', 'pendente', 'concluida'];
const EDGE: Partial<Record<SurgeryStatus, string>> = {
  em_andamento: 'border-l-tv-blue', em_preparacao: 'border-l-violet-400', recuperacao: 'border-l-teal-400', pendente: 'border-l-tv-orange', concluida: 'border-l-tv-green'
};

/** Sala de espera: exibe apenas nome abreviado e status (espelho minimizado `painel_espera`). Sem procedimento, médico ou prontuário. */
export default function PainelEsperaPage() {
  const identity = useIdentity();
  const now = useNow(1000);
  const today = todayISO(now);
  const online = useOnline(subscribeConnection);
  const { data, loading, error } = useSubscription<PainelEsperaItem[]>((cb, err) => subscribePainelEspera(cb, err), []);
  const items = useMemo(() => data.filter((s) => s.date === today && ORDER.includes(s.status))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.time ?? '').localeCompare(b.time ?? '')), [data, today]);
  const changed = useChangedIds(items);

  if (identity.salaEsperaAtiva === false) return <div className="flex min-h-screen items-center justify-center bg-tv-bg p-8 text-xl text-tv-mute">Painel da sala de espera desativado.</div>;
  return (
    <div className="flex min-h-screen flex-col bg-tv-bg text-tv-text">
      <PanelHeader logo={identity.logo} hospital={identity.hospitalName} subtitle="ACOMPANHAMENTO DE CIRURGIAS" now={now} online={online} seconds={false} />
      {!online && <OfflineBanner />}
      <main className="flex-1 p-6">
        {loading ? <div className="flex justify-center py-20"><Spinner /></div> : error ? <ErrorState message={error} /> : items.length === 0 ? (
          <div className="mt-24 text-center"><p className="text-3xl font-semibold">Nenhuma cirurgia em acompanhamento no momento.</p><p className="mt-2 text-lg text-tv-mute">Assim que houver cirurgias do dia, elas aparecerão aqui.</p></div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((s) => (
              <li key={s.id} className={cn('flex items-center justify-between gap-4 rounded-xl border border-l-8 border-tv-line bg-tv-card p-5 transition-colors duration-700', EDGE[s.status], changed.has(s.id) && 'bg-tv-blue/25')}>
                <div className="min-w-0">
                  <div className="truncate text-3xl font-bold 2xl:text-4xl">{s.patientDisplay || 'Paciente'}</div>
                  <div className="mt-1 text-lg text-tv-mute">{s.time ?? '--:--'}{s.room ? ` · ${s.room}` : ''}</div>
                </div>
                <StatusPill status={s.status} className="px-4 py-1.5 text-base" />
              </li>))}
          </ul>
        )}
      </main>
      <footer className="border-t border-tv-line px-6 py-2 text-center text-xs text-tv-mute">Por privacidade, são exibidos apenas o nome abreviado e a situação da cirurgia.</footer>
    </div>
  );
}
