import { lazy, Suspense, useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, CalendarCheck, Download, FileText, FolderOpen, Filter, Users, UserX, XCircle, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Badge, EmptyState, ErrorState, Field, PageHeader, Spinner } from '@/components/common';
import { useIdentity } from '@/hooks/useIdentity';
import { useEffect, useState as useStateX } from 'react';
import { useSurgeriesOnce } from '@/hooks/useSurgeries';
import { loadAbsences } from '@/services/database/others';
import { CLINICAS, ORIGENS, SALAS, STATUS_LABELS, clinicaNome } from '@/utils/constants';
import { downloadText, toCsv } from '@/utils/csv';
import { todayISO } from '@/utils/format';
import { exportAbsencesPdf, exportSurgeryReportPdf } from '@/utils/pdf';
import { ABSENCE_HEAD, REPORT_HEAD, absenceRows, describeFilter, filterSurgeries, monthRange, quickReport, reportRow, sortReport, statusCounts, type QuickKind, type ReportFilter } from '@/utils/reports';
import { SURGERY_STATUSES, type Absence, type Surgery, type SurgeryStatus } from '@/types';

const ReportCharts = lazy(() => import('./ReportCharts'));

type Result =
  | { kind: 'cirurgias'; title: string; data: Surgery[]; filtersText: string }
  | { kind: 'faltas'; title: string; data: Absence[]; filtersText: string };

const QUICK: { k: QuickKind | 'faltas'; label: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { k: 'hoje', label: 'Diário', hint: 'Hoje', icon: CalendarCheck, tone: 'text-sky-600' },
  { k: 'semana', label: 'Semanal', hint: 'Segunda a domingo', icon: CalendarRange, tone: 'text-indigo-600' },
  { k: 'mes', label: 'Mensal', hint: 'Mês atual', icon: CalendarDays, tone: 'text-emerald-600' },
  { k: 'mutiroes', label: 'Mutirões', hint: 'Todos os mutirões', icon: Users, tone: 'text-amber-600' },
  { k: 'canceladas', label: 'Canceladas', hint: 'Com motivo', icon: XCircle, tone: 'text-red-600' },
  { k: 'faltas', label: 'Faltantes', hint: 'Absenteísmo', icon: UserX, tone: 'text-orange-700' },
  { k: 'geral', label: 'Geral', hint: 'Todas as cirurgias', icon: FolderOpen, tone: 'text-slate-500' }
];

const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b));

function useAbsencesOnce() {
  const [st, setSt] = useStateX<{ data: Absence[]; error: string | null }>({ data: [], error: null });
  useEffect(() => { let vivo = true; loadAbsences().then((data) => vivo && setSt({ data, error: null })).catch(() => vivo && setSt({ data: [], error: 'Não foi possível carregar as faltas.' })); return () => { vivo = false; }; }, []);
  return st;
}

export default function RelatoriosPage() {
  const identity = useIdentity();
  const surg = useSurgeriesOnce(null, null); // relatórios usam o histórico completo, lido uma vez (cache curto)
  const abs = useAbsencesOnce();
  const [result, setResult] = useState<Result | null>(null);
  const [f, setF] = useState<ReportFilter>(() => ({ ...monthRange(), statuses: [] }));
  const set = <K extends keyof ReportFilter>(k: K, v: ReportFilter[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleStatus = (s: SurgeryStatus) => set('statuses', f.statuses.includes(s) ? f.statuses.filter((x) => x !== s) : [...f.statuses, s]);

  const opts = useMemo(() => ({
    esp: uniq(surg.data.map((s) => s.specialty)), origem: uniq([...ORIGENS.map((o) => o.value), ...surg.data.map((s) => s.origem)]),
    mut: uniq(surg.data.filter((s) => s.origem === 'Mutirão').map((s) => s.mutiraoNome)), med: uniq(surg.data.map((s) => s.doctor))
  }), [surg.data]);
  const preview = useMemo(() => filterSurgeries(surg.data, f).length, [surg.data, f]);
  const branding = { systemName: identity.systemName, hospitalName: identity.hospitalName, logo: identity.logo, govLogo: identity.govLogo };

  function openQuick(k: QuickKind | 'faltas') {
    if (k === 'faltas') { setResult({ kind: 'faltas', title: 'Relatório de Faltantes (Absenteísmo)', data: abs.data, filtersText: '' }); return; }
    const q = quickReport(k, surg.data);
    setResult({ kind: 'cirurgias', title: q.title, data: q.data, filtersText: '' });
  }
  function openCustom() {
    const text = describeFilter(f, clinicaNome);
    setResult({ kind: 'cirurgias', title: 'Relatório personalizado', data: filterSurgeries(surg.data, f), filtersText: text });
    setTimeout(() => document.getElementById('relatorio-resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  const fileStamp = todayISO();
  function pdf() {
    if (!result) return;
    if (result.kind === 'faltas') exportAbsencesPdf(branding, result.title, result.data, `relatorio_faltas_${fileStamp}.pdf`);
    else exportSurgeryReportPdf(branding, result.title, result.data, result.filtersText, `relatorio_${fileStamp}.pdf`);
  }
  function csv() {
    if (!result) return;
    if (result.kind === 'faltas') downloadText(`relatorio_faltas_${fileStamp}.csv`, toCsv(ABSENCE_HEAD, absenceRows(result.data)));
    else downloadText(`relatorio_${fileStamp}.csv`, toCsv(REPORT_HEAD, sortReport(result.data).map(reportRow)));
  }

  if (surg.loading) return <Spinner />;
  if (surg.error) return <ErrorState message={surg.error} />;
  const rows = result?.kind === 'cirurgias' ? sortReport(result.data).map(reportRow) : result ? absenceRows(result.data) : [];
  const head = result?.kind === 'faltas' ? ABSENCE_HEAD : REPORT_HEAD;
  const statusCol = REPORT_HEAD.indexOf('Status');

  return (
    <div className="space-y-5">
      <PageHeader title="Relatórios" subtitle="Clique em um relatório para visualizar na tela; o PDF só é gerado se você quiser baixar." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {QUICK.map(({ k, label, hint, icon: Icon, tone }) => (
          <button key={k} onClick={() => openQuick(k)} className="card flex flex-col items-start gap-1 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline">
            <Icon size={22} className={tone} /><span className="mt-1 font-bold text-slate-800">{label}</span><span className="text-xs text-slate-500">{hint}</span>
          </button>
        ))}
      </div>

      <section className="card space-y-4" aria-label="Relatório personalizado">
        <div className="flex items-center gap-2"><Filter size={18} className="text-brand" /><h2 className="font-bold text-brand">Relatório personalizado</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Período — de"><input type="date" className="input" value={f.from ?? ''} onChange={(e) => set('from', e.target.value)} /></Field>
          <Field label="Período — até"><input type="date" className="input" value={f.to ?? ''} onChange={(e) => set('to', e.target.value)} /></Field>
          <Field label="Especialidade"><select className="input" value={f.especialidade ?? ''} onChange={(e) => set('especialidade', e.target.value)}><option value="">Todas</option>{opts.esp.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Origem"><select className="input" value={f.origem ?? ''} onChange={(e) => set('origem', e.target.value)}><option value="">Todas</option>{opts.origem.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Mutirão"><select className="input" value={f.mutirao ?? ''} onChange={(e) => set('mutirao', e.target.value)}><option value="">Todos</option>{opts.mut.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Sala"><select className="input" value={f.sala ?? ''} onChange={(e) => set('sala', e.target.value)}><option value="">Todas</option>{SALAS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Médico"><select className="input" value={f.medico ?? ''} onChange={(e) => set('medico', e.target.value)}><option value="">Todos</option>{opts.med.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Clínica solicitante"><select className="input" value={f.clinicaId ?? ''} onChange={(e) => set('clinicaId', e.target.value)}><option value="">Todas</option>{CLINICAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
        </div>
        <fieldset>
          <legend className="label">Status da cirurgia</legend>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={f.statuses.length === 0} onClick={() => set('statuses', [])} className={clsx('rounded-full border px-3 py-1 text-xs font-semibold transition', f.statuses.length === 0 ? 'border-brand bg-brand text-white dark:border-teal dark:bg-teal dark:text-night' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}>Todos</button>
            {SURGERY_STATUSES.map((s) => {
              const on = f.statuses.includes(s);
              return <button type="button" key={s} aria-pressed={on} onClick={() => toggleStatus(s)} className={clsx('rounded-full border px-3 py-1 text-xs font-semibold transition', on ? 'border-brand bg-brand text-white dark:border-teal dark:bg-teal dark:text-night' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}>{STATUS_LABELS[s]}</button>;
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={openCustom}><FileText size={16} /> Visualizar</button>
          <button className="btn-secondary" onClick={() => setF({ ...monthRange(), statuses: [] })}>Limpar filtros</button>
          <span className="text-sm text-slate-500" aria-live="polite">{preview} cirurgia(s) com estes filtros</span>
        </div>
      </section>

      {result && (
        <section id="relatorio-resultado" className="card space-y-3" aria-label="Resultado do relatório">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-bold text-brand">{result.title}</h2><p className="text-sm text-slate-500">Total: {result.data.length} {result.kind === 'faltas' ? 'falta(s)' : 'cirurgia(s)'}</p>{result.filtersText && <p className="text-xs text-slate-500">{result.filtersText}</p>}</div>
            <div className="flex gap-2"><button className="btn-secondary" onClick={csv} disabled={!result.data.length}><Download size={16} /> CSV</button><button className="btn-primary" onClick={pdf} disabled={!result.data.length}><FileText size={16} /> Baixar PDF</button></div>
          </div>
          {result.kind === 'cirurgias' && <div className="flex flex-wrap gap-2">{statusCounts(result.data).map((c) => <Badge key={c.status} tone={c.status}>{c.label}: {c.count}</Badge>)}</div>}
          {result.kind === 'cirurgias' && result.data.length > 0 && <Suspense fallback={<Spinner label="Carregando gráficos..." />}><ReportCharts data={result.data} /></Suspense>}
          {rows.length === 0 ? <EmptyState>Nenhum registro para este filtro.</EmptyState> : (
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-50"><tr>{head.map((h) => <th key={h} className="whitespace-nowrap border-b border-slate-200 px-2.5 py-2 font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60 dark:odd:bg-transparent dark:even:bg-transparent">{r.map((c, j) => <td key={j} className={clsx('whitespace-nowrap px-2.5 py-1.5', result.kind === 'cirurgias' && j === statusCol && 'font-semibold')}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">Contém dados pessoais (LGPD): use apenas para a finalidade assistencial/administrativa e não compartilhe.</p>
        </section>
      )}
      {abs.error && <ErrorState message={abs.error} />}
    </div>
  );
}
