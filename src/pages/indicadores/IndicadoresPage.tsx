import { useMemo, useState } from 'react';
import { Activity, CalendarX, CheckCircle2, Percent, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { ErrorState, Field, PageHeader, Spinner, StatCard } from '@/components/common';
import { useEffect, useState as useStateX } from 'react';
import { useSurgeriesOnce } from '@/hooks/useSurgeries';
import { loadAbsences } from '@/services/database/others';
import { todayISO } from '@/utils/format';
import { filterSurgeries, kpis, monthRange, monthlyEvolution, topProcedures } from '@/utils/reports';
import ReportCharts, { Bars, Box } from '../relatorios/ReportCharts';
import type { Absence } from '@/types';

type Preset = '7d' | '30d' | 'mes' | 'ano' | 'custom';
const ago = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return todayISO(d); };

/** Indicadores em gráficos para acompanhamento rápido (período à escolha). */
/** Faltas (leitura única com cache curto). */
function useAbsencesOnce() {
  const [st, setSt] = useStateX<{ data: Absence[]; error: string | null }>({ data: [], error: null });
  useEffect(() => { let vivo = true; loadAbsences().then((data) => vivo && setSt({ data, error: null })).catch(() => vivo && setSt({ data: [], error: 'Não foi possível carregar as faltas.' })); return () => { vivo = false; }; }, []);
  return st;
}

export default function IndicadoresPage() {
  const [preset, setPreset] = useState<Preset>('mes');
  const [custom, setCustom] = useState({ from: monthRange().from, to: todayISO() });
  const range = useMemo(() => {
    const t = todayISO();
    switch (preset) {
      case '7d': return { from: ago(6), to: t };
      case '30d': return { from: ago(29), to: t };
      case 'ano': return { from: `${new Date().getFullYear()}-01-01`, to: t };
      case 'custom': return custom;
      default: return monthRange();
    }
  }, [preset, custom]);
  const surg = useSurgeriesOnce(range.from || null, range.to || null);
  const abs = useAbsencesOnce();
  const data = useMemo(() => filterSurgeries(surg.data, { ...range, statuses: [] }), [surg.data, range]);
  const faltas = useMemo(() => abs.data.filter((a) => a.date >= range.from && a.date <= range.to).length, [abs.data, range]);
  const k = useMemo(() => kpis(data, faltas), [data, faltas]);

  if (surg.loading) return <Spinner />;
  if (surg.error) return <ErrorState message={surg.error} />;
  const chip = (p: Preset, label: string) => (
    <button key={p} type="button" aria-pressed={preset === p} onClick={() => setPreset(p)}
      className={clsx('rounded-full border px-3.5 py-1.5 text-xs font-semibold transition', preset === p ? 'border-brand bg-brand text-white dark:border-teal-600 dark:bg-teal-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:hover:bg-night-raised')}>{label}</button>
  );
  return (
    <div className="space-y-4">
      <PageHeader title="Indicadores" subtitle="Visualização rápida em gráficos" />
      <div className="card flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período">{chip('7d', 'Últimos 7 dias')}{chip('30d', 'Últimos 30 dias')}{chip('mes', 'Mês atual')}{chip('ano', 'Ano atual')}{chip('custom', 'Personalizado')}</div>
        {preset === 'custom' && <>
          <Field label="De"><input type="date" className="input" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></Field>
          <Field label="Até"><input type="date" className="input" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></Field>
        </>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Cirurgias" value={k.total} icon={<Activity />} />
        <StatCard label={`Finalizadas (${k.taxaConclusao}%)`} value={k.concluidas} icon={<CheckCircle2 />} tone="text-emerald-600" />
        <StatCard label={`Canceladas (${k.taxaCancelamento}%)`} value={k.canceladas} icon={<XCircle />} tone="text-red-600" />
        <StatCard label="Suspensas" value={k.suspensas} icon={<XCircle />} tone="text-slate-500" />
        <StatCard label={`Faltas (absenteísmo ${k.taxaAbsenteismo}%)`} value={k.faltas} icon={<CalendarX />} tone="text-orange-600" />
      </div>
      {data.length === 0 ? <div className="card text-center text-sm text-slate-500"><Percent className="mx-auto mb-2" /> Nenhuma cirurgia no período selecionado.</div> : (
        <div className="card space-y-3">
          <ReportCharts data={data} />
          <div className="grid gap-3 lg:grid-cols-2">
            <Box title="Evolução mensal"><Bars data={monthlyEvolution(data)} color="#0B6E99" /></Box>
            <Box title="Procedimentos mais realizados"><Bars data={topProcedures(data)} horizontal color="#00A89A" /></Box>
          </div>
        </div>
      )}
    </div>
  );
}
