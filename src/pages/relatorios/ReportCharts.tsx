import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { Surgery } from '@/types';
import { reportCharts, type ChartDatum } from '@/utils/reports';

const STATUS_COLOR: Record<string, string> = {
  pendente: '#F59E0B', em_preparacao: '#8B5CF6', em_andamento: '#2F6FED', recuperacao: '#0EA5A4', concluida: '#16A34A', suspensa: '#64748B', cancelada: '#E5484D'
};
export const STATUS_COLORS = STATUS_COLOR;
const BRAND = '#0B6E99';

export function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 p-3"><h3 className="mb-1 text-sm font-bold text-slate-700">{title}</h3><div className="h-60">{children}</div></div>;
}

export function Bars({ data, horizontal, color = BRAND }: { data: ChartDatum[]; horizontal?: boolean; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 16 : 0, right: 16, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={!horizontal} vertical={!!horizontal} />
        {horizontal ? <><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="label" width={110} fontSize={11} /></> : <><XAxis dataKey="label" fontSize={11} interval={0} angle={data.length > 6 ? -35 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 50 : 24} /><YAxis allowDecimals={false} fontSize={11} /></>}
        <Tooltip /><Bar dataKey="total" name="Cirurgias" fill={color} radius={[4, 4, 0, 0]} label={{ position: horizontal ? 'right' : 'top', fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Visualização rápida do resultado do relatório. */
export default function ReportCharts({ data }: { data: Surgery[] }) {
  const c = reportCharts(data);
  return (
    <div className="grid gap-3 lg:grid-cols-2" aria-label="Gráficos do relatório">
      <Box title="Cirurgias por status">
        <ResponsiveContainer width="100%" height="100%"><PieChart>
          <Pie data={c.status} dataKey="total" nameKey="label" innerRadius={50} outerRadius={85} paddingAngle={2} label={(e) => String(e.value)}>{c.status.map((s) => <Cell key={s.status} fill={STATUS_COLOR[s.status]} />)}</Pie>
          <Tooltip /><Legend />
        </PieChart></ResponsiveContainer>
      </Box>
      <Box title="Cirurgias por dia"><Bars data={c.porDia} /></Box>
      <Box title="Por especialidade"><Bars data={c.especialidade} horizontal color="#0B3B5C" /></Box>
      <Box title="Por origem"><Bars data={c.origem} horizontal color="#00A89A" /></Box>
      <Box title="Por sala"><Bars data={c.sala} /></Box>
      <Box title="Médicos (top 10)"><Bars data={c.medicos} horizontal color="#6366F1" /></Box>
    </div>
  );
}
