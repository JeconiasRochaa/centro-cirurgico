import { describe, expect, it } from 'vitest';
import { reportCharts, absenceRows, describeFilter, filterSurgeries, monthRange, quickReport, reportRow, statusCounts, weekRange, REPORT_HEAD } from '@/utils/reports';
import { mirrorFor } from '@/utils/mirror';
import type { Surgery } from '@/types';

const mk = (o: Partial<Surgery>): Surgery => ({ id: 'x', patient: 'MARIA SOUZA', type: 'APEN-01 - Apendicectomia', date: '2026-11-10', status: 'concluida', ...o });
const list = [
  mk({ id: 'a', date: '2026-11-02', status: 'concluida', specialty: 'Cirurgia Geral', room: 'SALA A' }),
  mk({ id: 'b', date: '2026-11-10', status: 'cancelada', cancelReason: 'Sem jejum', specialty: 'Ortopedia' }),
  mk({ id: 'c', date: '2026-11-18', status: 'pendente', origem: 'Mutirão', mutiraoNome: 'Mutirão Hérnia' }),
  mk({ id: 'd', date: '2026-12-01', status: 'suspensa', suspendReason: 'Equipamento' })
];

describe('relatórios', () => {
  it('filtra por período e por vários status', () => {
    const r = filterSurgeries(list, { from: '2026-11-01', to: '2026-11-30', statuses: ['concluida', 'cancelada'] });
    expect(r.map((s) => s.id)).toEqual(['a', 'b']);
  });
  it('sem status selecionado = todos; combina filtros', () => {
    expect(filterSurgeries(list, { statuses: [] })).toHaveLength(4);
    expect(filterSurgeries(list, { statuses: [], especialidade: 'Ortopedia' }).map((s) => s.id)).toEqual(['b']);
    expect(filterSurgeries(list, { statuses: [], mutirao: 'Mutirão Hérnia' }).map((s) => s.id)).toEqual(['c']);
  });
  it('semana (seg–dom) e mês', () => {
    expect(weekRange(new Date(2026, 10, 18))).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(weekRange(new Date(2026, 10, 22))).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(monthRange(new Date(2026, 10, 18))).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });
  it('relatórios rápidos', () => {
    expect(quickReport('canceladas', list).data.map((s) => s.id)).toEqual(['b']);
    expect(quickReport('mutiroes', list).data.map((s) => s.id)).toEqual(['c']);
    expect(quickReport('mes', list, new Date(2026, 10, 18)).data).toHaveLength(3);
    expect(quickReport('hoje', list, new Date(2026, 10, 10)).data.map((s) => s.id)).toEqual(['b']);
  });
  it('resumo por status e linha com 16 colunas', () => {
    expect(statusCounts(list).map((c) => c.count)).toEqual([1, 1, 1, 1].slice(0, statusCounts(list).length));
    expect(reportRow(list[1], 0)).toHaveLength(REPORT_HEAD.length);
    expect(reportRow(list[1], 0)[15]).toBe('Sem jejum');
  });
  it('descreve filtros e linhas de faltas', () => {
    expect(describeFilter({ from: '2026-11-01', to: '2026-11-30', statuses: ['cancelada'] }, () => '')).toContain('Cancelada');
    expect(absenceRows([{ id: '1', patient: 'João', date: '2026-11-01' }])[0][2]).toBe('João');
  });
});

describe('gráficos', () => {
  it('agrega por status, especialidade, dia e sala', () => {
    const c = reportCharts(list);
    expect(c.status.reduce((n, x) => n + x.total, 0)).toBe(4);
    expect(c.especialidade.find((x) => x.label === 'Ortopedia')?.total).toBe(1);
    expect(c.especialidade.find((x) => x.label === 'Não informado')?.total).toBe(2);
    expect(c.porDia.map((d) => d.label)).toEqual(['02/11', '10/11', '18/11', '01/12']);
    expect(c.sala.find((x) => x.label === 'SALA A')?.total).toBe(1);
  });
});

describe('espelho dos painéis (cliente)', () => {
  const s = { id: 'a', patient: 'MARIA DA SILVA', prontuario: '123', birthDate: '1980-01-01', date: '2026-11-18', status: 'pendente', type: 'X', cpf: '1' };
  it('nunca inclui prontuário, CPF ou nascimento; abrevia o nome', () => {
    const m = mirrorFor('a', s, '2026-11-18', false);
    expect(m.tv).not.toHaveProperty('prontuario'); expect(m.tv).not.toHaveProperty('cpf'); expect(m.tv).not.toHaveProperty('birthDate');
    expect(m.tv?.patient).toBe('MARIA D. S.');
    expect(m.espera?.patientDisplay).toBe('MARIA D. S.');
  });
  it('remove passadas e excluídas', () => {
    expect(mirrorFor('a', s, '2026-11-19', false)).toEqual({ tv: null, espera: null });
    expect(mirrorFor('a', { ...s, deletedAt: 1 }, '2026-11-18', false)).toEqual({ tv: null, espera: null });
  });
});

import { kpis, monthlyEvolution, topProcedures } from '@/utils/reports';
describe('indicadores', () => {
  it('kpis, evolução mensal e procedimentos', () => {
    const k = kpis(list, 1);
    expect(k.total).toBe(4); expect(k.concluidas).toBe(1); expect(k.taxaCancelamento).toBe(25); expect(k.taxaAbsenteismo).toBe(20);
    expect(kpis([], 0).taxaConclusao).toBe(0);
    expect(monthlyEvolution(list)).toEqual([{ label: '11/2026', total: 3 }, { label: '12/2026', total: 1 }]);
    expect(topProcedures(list)[0]).toEqual({ label: 'Apendicectomia', total: 4 });
  });
});
