import { describe, expect, it } from 'vitest';
import { abbreviateName, mirrorFor } from './mirrorPure';

const base = { id: 'a', patient: 'MARIA SILVA PEREIRA', prontuario: '123', birthDate: '1980-01-01', observacoes: 'alergia grave', date: '2026-11-16', status: 'em_andamento', room: 'SALA A', type: 'X-01 - APENDICECTOMIA', age: 46 };

describe('espelho dos painéis (minimização LGPD)', () => {
  it('abrevia nomes', () => { expect(abbreviateName('MARIA SILVA PEREIRA')).toBe('MARIA S. P.'); });
  it('nunca inclui prontuário, nascimento ou observações', () => {
    const m = mirrorFor('a', base, '2026-11-16', false);
    const json = JSON.stringify(m);
    expect(json).not.toContain('123'); expect(json).not.toContain('1980'); expect(json).not.toContain('alergia');
  });
  it('TV usa nome abreviado por padrão e completo só se configurado', () => {
    expect(mirrorFor('a', base, '2026-11-16', false).tv?.patient).toBe('MARIA S. P.');
    expect(mirrorFor('a', base, '2026-11-16', true).tv?.patient).toBe('MARIA SILVA PEREIRA');
  });
  it('sala de espera só tem nome abreviado', () => { expect(mirrorFor('a', base, '2026-11-16', true).espera?.patientDisplay).toBe('MARIA S. P.'); });
  it('remove excluídas e datas passadas', () => {
    expect(mirrorFor('a', { ...base, deletedAt: 1 }, '2026-11-16', false)).toEqual({ tv: null, espera: null });
    expect(mirrorFor('a', { ...base, date: '2026-11-15' }, '2026-11-16', false)).toEqual({ tv: null, espera: null });
  });
  it('sala de espera ignora cirurgias canceladas/suspensas e futuras', () => {
    expect(mirrorFor('a', { ...base, status: 'cancelada' }, '2026-11-16', false).espera).toBeNull();
    expect(mirrorFor('a', { ...base, date: '2026-11-20' }, '2026-11-16', false).espera).toBeNull();
  });
});
