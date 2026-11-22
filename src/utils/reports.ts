import { SURGERY_STATUSES, type Absence, type Surgery, type SurgeryStatus } from '@/types';
import { STATUS_LABELS } from './constants';
import { doctorTitle, formatDate, todayISO } from './format';

export interface ReportFilter {
  from?: string; to?: string;
  /** Vazio = todos os status. */
  statuses: SurgeryStatus[];
  especialidade?: string; origem?: string; mutirao?: string; sala?: string; medico?: string; clinicaId?: string;
}

export function filterSurgeries(list: Surgery[], f: ReportFilter): Surgery[] {
  return list.filter((s) =>
    (!f.from || s.date >= f.from) && (!f.to || s.date <= f.to) &&
    (f.statuses.length === 0 || f.statuses.includes(s.status)) &&
    (!f.especialidade || s.specialty === f.especialidade) && (!f.origem || s.origem === f.origem) &&
    (!f.mutirao || s.mutiraoNome === f.mutirao) && (!f.sala || s.room === f.sala) &&
    (!f.medico || s.doctor === f.medico) && (!f.clinicaId || s.clinicaId === f.clinicaId));
}

const iso = (d: Date) => todayISO(d);
/** Semana de segunda a domingo. */
export function weekRange(now = new Date()): { from: string; to: string } {
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return { from: iso(mon), to: iso(sun) };
}
export function monthRange(now = new Date()): { from: string; to: string } {
  return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

export type QuickKind = 'hoje' | 'semana' | 'mes' | 'mutiroes' | 'canceladas' | 'geral';
export function quickReport(kind: QuickKind, list: Surgery[], now = new Date()): { title: string; data: Surgery[] } {
  const today = iso(now);
  switch (kind) {
    case 'hoje': return { title: 'Relatório Diário', data: list.filter((s) => s.date === today) };
    case 'semana': { const r = weekRange(now); return { title: 'Relatório Semanal', data: filterSurgeries(list, { ...r, statuses: [] }) }; }
    case 'mes': { const r = monthRange(now); return { title: 'Relatório Mensal', data: filterSurgeries(list, { ...r, statuses: [] }) }; }
    case 'mutiroes': return { title: 'Relatório de Mutirões', data: list.filter((s) => s.origem === 'Mutirão') };
    case 'canceladas': return { title: 'Relatório de Canceladas', data: list.filter((s) => s.status === 'cancelada') };
    default: return { title: 'Relatório Geral', data: list };
  }
}

export function statusCounts(list: Surgery[]): { status: SurgeryStatus; label: string; count: number }[] {
  return SURGERY_STATUSES.map((status) => ({ status, label: STATUS_LABELS[status], count: list.filter((s) => s.status === status).length })).filter((x) => x.count > 0);
}

export const sortReport = (list: Surgery[]) => [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));

export const REPORT_HEAD = ['Nº', 'Data', 'Hora', 'Paciente', 'Idade', 'Procedimento', 'Médico', 'Anestesista', 'Instrumentador(a)', 'Especialidade', 'Sala', 'Origem', 'Sangue', 'UTI', 'Status', 'Motivo'];
const yn = (v?: string) => (v === 'sim' ? 'Sim' : 'Não');
const person = (n?: string) => (n ? `${doctorTitle(n)} ${n}` : '-');

export function reportRow(s: Surgery, i: number): string[] {
  const origem = s.origem === 'Mutirão' && s.mutiraoNome ? `Mutirão — ${s.mutiraoNome}` : s.origem;
  return [String(i + 1), formatDate(s.date), s.time || '-', s.patient || '-', s.age !== undefined && s.age !== '' ? String(s.age) : '-',
    (s.type || '-').replace(/\n/g, ', '), person(s.doctor), person(s.anesthetist), s.instrumentador || '-', s.specialty || '-', s.room || '-', origem || '-',
    yn(s.necessitaSangue), yn(s.necessitaUTI), STATUS_LABELS[s.status] ?? s.status ?? '-', s.cancelReason || s.suspendReason || '-'];
}

export const ABSENCE_HEAD = ['Nº', 'Data', 'Paciente', 'Município', 'Procedimento', 'Motivo', 'Registrado por'];
export function absenceRows(list: Absence[]): string[][] {
  return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((f, i) => [String(i + 1), formatDate(f.date), f.patient || '-', f.municipio || '-', f.procedure || '-', f.reason || '-', f.registradoPor || '-']);
}

/** Descrição textual dos filtros (para o cabeçalho do PDF). */
export function describeFilter(f: ReportFilter, clinicaNome: (id?: string) => string): string {
  const p: string[] = [];
  if (f.from || f.to) p.push(`Período: ${formatDate(f.from)} a ${formatDate(f.to)}`);
  p.push(`Status: ${f.statuses.length ? f.statuses.map((s) => STATUS_LABELS[s]).join(', ') : 'todos'}`);
  if (f.especialidade) p.push(`Especialidade: ${f.especialidade}`);
  if (f.origem) p.push(`Origem: ${f.origem}`);
  if (f.mutirao) p.push(`Mutirão: ${f.mutirao}`);
  if (f.sala) p.push(`Sala: ${f.sala}`);
  if (f.medico) p.push(`Médico: ${f.medico}`);
  if (f.clinicaId) p.push(`Clínica: ${clinicaNome(f.clinicaId)}`);
  return p.join('  |  ');
}

export interface ChartDatum { label: string; total: number }
const tally = (list: Surgery[], key: (s: Surgery) => string | undefined, empty = 'Não informado'): ChartDatum[] => {
  const m = new Map<string, number>();
  for (const s of list) { const k = key(s) || empty; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
};

/** Dados agregados para os gráficos de visualização rápida. */
export function reportCharts(list: Surgery[]) {
  return {
    status: statusCounts(list).map((c) => ({ label: c.label, total: c.count, status: c.status })),
    especialidade: tally(list, (s) => s.specialty),
    origem: tally(list, (s) => s.origem),
    sala: tally(list, (s) => s.room, 'Sem sala'),
    medicos: tally(list.filter((s) => s.doctor), (s) => s.doctor).slice(0, 10),
    porDia: tally(list, (s) => s.date).sort((a, b) => a.label.localeCompare(b.label)).map((d) => ({ label: formatDate(d.label).slice(0, 5), total: d.total }))
  };
}

export interface Kpis { total: number; concluidas: number; canceladas: number; suspensas: number; emAndamento: number; taxaConclusao: number; taxaCancelamento: number; faltas: number; taxaAbsenteismo: number }
/** Indicadores do período. Absenteísmo = faltas / (cirurgias + faltas). Percentuais com 1 casa decimal. */
export function kpis(list: Surgery[], faltas: number): Kpis {
  const n = (st: SurgeryStatus[]) => list.filter((s) => st.includes(s.status)).length;
  const total = list.length;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  return {
    total, concluidas: n(['concluida']), canceladas: n(['cancelada']), suspensas: n(['suspensa']), emAndamento: n(['em_preparacao', 'em_andamento', 'recuperacao']),
    taxaConclusao: pct(n(['concluida']), total), taxaCancelamento: pct(n(['cancelada']), total), faltas, taxaAbsenteismo: pct(faltas, total + faltas)
  };
}

/** Evolução mensal (AAAA-MM → MM/AAAA) em ordem cronológica. */
export function monthlyEvolution(list: Surgery[]): ChartDatum[] {
  const m = new Map<string, number>();
  for (const s of list) { const k = s.date.slice(0, 7); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([k, total]) => ({ label: `${k.slice(5, 7)}/${k.slice(0, 4)}`, total }));
}

/** Procedimentos mais realizados (nome sem o código interno). */
export function topProcedures(list: Surgery[], limit = 10): ChartDatum[] {
  const m = new Map<string, number>();
  for (const s of list) for (const raw of (s.type || '').split('\n')) { const i = raw.indexOf(' - '); const name = (i !== -1 ? raw.slice(i + 3) : raw).trim(); if (name) m.set(name, (m.get(name) ?? 0) + 1); }
  return [...m].map(([label, total]) => ({ label: label.length > 34 ? `${label.slice(0, 33)}…` : label, total })).sort((a, b) => b.total - a.total).slice(0, limit);
}
