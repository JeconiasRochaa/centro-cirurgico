import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Field, PageHeader, Spinner, StatCard } from '@/components/common';
import { useSurgeriesOnce } from '@/hooks/useSurgeries';
import { STATUS_LABELS } from '@/utils/constants';
import { downloadText, toCsv } from '@/utils/csv';
import { formatDate, procedureNames } from '@/utils/format';

function monthRange() {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0');
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { from: `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`, to: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(last)}` };
}

export default function FaturamentoPage() {
  const [range, setRange] = useState(monthRange());
  const { data, loading, error } = useSurgeriesOnce(range.from || null, range.to || null);
  const [status, setStatus] = useState('concluida');
  const [q, setQ] = useState('');
  const list = useMemo(() => data.filter((s) => s.date >= range.from && s.date <= range.to && (!status || s.status === status) && (!q.trim() || [s.patient, s.prontuario, s.code].some((v) => (v ?? '').toLowerCase().includes(q.trim().toLowerCase())))).sort((a, b) => a.date.localeCompare(b.date)), [data, range, status, q]);
  const procCount = useMemo(() => list.reduce((n, s) => n + procedureNames(s.type).length, 0), [list]);

  const exportCsv = () => downloadText(`faturamento-${range.from}_${range.to}.csv`, toCsv(
    ['Código', 'Data', 'Paciente', 'Prontuário', 'Procedimentos', 'Especialidade', 'Médico', 'Sala', 'Status'],
    list.map((s) => [s.code, s.date, s.patient, s.prontuario, procedureNames(s.type).join(' | '), s.specialty, s.doctor, s.room, STATUS_LABELS[s.status]])));

  return (
    <div>
      <PageHeader title="Faturamento" subtitle="Cirurgias por período (somente leitura)" actions={<button className="btn-secondary" onClick={exportCsv} disabled={!list.length}><Download size={16} /> Exportar CSV</button>} />
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Buscar paciente / prontuário"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou nº do prontuário" /></Field>
        <Field label="De"><input type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
        <Field label="Até"><input type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
        <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><StatCard label="Cirurgias" value={list.length} /><StatCard label="Procedimentos" value={procCount} /></div>
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : list.length === 0 ? <EmptyState /> : (
        <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data</th><th className="p-3">Prontuário</th><th className="p-3">Paciente</th><th className="p-3">Procedimentos</th><th className="p-3">Médico</th><th className="p-3">Status</th></tr></thead>
          <tbody>{list.map((s) => <tr key={s.id} className="border-t border-slate-100 align-top"><td className="p-3">{formatDate(s.date)}</td><td className="p-3 font-mono text-xs">{s.prontuario || '-'}</td><td className="p-3 font-medium">{s.patient}</td><td className="whitespace-pre-line p-3">{procedureNames(s.type).join('\n')}</td><td className="p-3">{s.doctor ?? '-'}</td><td className="p-3"><Badge tone={s.status}>{STATUS_LABELS[s.status]}</Badge></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
