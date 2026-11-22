import { describe, expect, it } from 'vitest';
import { abbreviateName, calcAge, patientKey, procedureNames, safeFbKey } from '@/utils/format';
import { csvCell, toCsv } from '@/utils/csv';
import { friendlyError, AppError } from '@/utils/errors';
import { clinicaSigla, countStatuses, dueForNotice, minutesUntil, sortForTV } from '@/pages/painel-tv/tvLogic';
import type { PainelTVItem } from '@/types';

describe('formatação', () => {
  it('abrevia nome mantendo o primeiro', () => expect(abbreviateName('maria da silva santos')).toBe('maria d. s. s.'));
  it('calcula idade', () => expect(calcAge('2000-06-15', new Date(2026, 5, 14))).toBe(25));
  it('remove código do procedimento', () => expect(procedureNames('APEN-01 - Apendicectomia\nHERN-02 - Hernioplastia')).toEqual(['Apendicectomia', 'Hernioplastia']));
  it('chaves seguras para o Firebase', () => expect(safeFbKey('a.b#c$d[e]f/g')).toBe('a_b_c_d_e_f_g'));
  it('chave de paciente por prontuário ou nome', () => {
    expect(patientKey({ prontuario: ' 123 ' })).toBe('P_123');
    expect(patientKey({ patient: 'ana' })).toBe('N_ANA');
  });
});

describe('CSV', () => {
  it('neutraliza injeção de fórmula', () => {
    for (const v of ['=1+1', '+cmd', '-2', '@SUM(A1)']) expect(csvCell(v)).toBe(`"'${v}"`);
  });
  it('escapa aspas e gera cabeçalho', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(toCsv(['A', 'B'], [['x', null]])).toBe('"A";"B"\r\n"x";""');
  });
});

describe('erros', () => {
  it('não vaza detalhes internos', () => {
    expect(friendlyError(new Error('stack secreto /srv/app'))).toBe('Não foi possível concluir a operação. Tente novamente.');
    expect(friendlyError({ code: 'auth/wrong-password' })).toBe('Usuário ou senha inválidos.');
    expect(friendlyError({ code: 'auth/user-not-found' })).toBe('Usuário ou senha inválidos.');
    expect(friendlyError({ message: 'PERMISSION_DENIED: Permission denied' })).toMatch(/permissão/);
    expect(friendlyError(new AppError('msg própria'))).toBe('msg própria');
  });
});

const item = (o: Partial<PainelTVItem>): PainelTVItem => ({ id: 'x', date: '2026-11-17', status: 'pendente', ...o });
describe('painel TV', () => {
  it('ordena por status e hora', () => {
    const r = sortForTV([item({ id: 'a', status: 'concluida' }), item({ id: 'b', status: 'em_andamento', time: '10:00' }), item({ id: 'c', status: 'em_andamento', time: '08:00' })]);
    expect(r.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('conta status', () => expect(countStatuses([item({ status: 'recuperacao' }), item({ status: 'suspensa' }), item({})])).toEqual({ andamento: 1, finalizadas: 0, aguardando: 1, canceladas: 1 }));
  it('minutos até o horário e aviso 10 min antes', () => {
    const now = new Date(2026, 10, 17, 9, 50, 0);
    expect(minutesUntil('2026-11-17', '10:00', now)).toBe(10);
    expect(minutesUntil('2026-11-17', 'xx', now)).toBeNull();
    expect(dueForNotice([item({ id: 'ok', time: '10:00' }), item({ id: 'longe', time: '12:00' }), item({ id: 'amanha', date: '2026-11-18', time: '10:00' })], '2026-11-17', now).map((x) => x.id)).toEqual(['ok']);
  });
  it('siglas de clínicas, inclusive grafia legada', () => { expect(clinicaSigla('Clinica Medica I')).toBe('CM I'); expect(clinicaSigla('Pediatria')).toBe('PED'); });
});
