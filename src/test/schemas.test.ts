import { describe, expect, it } from 'vitest';
import { absenceSchema, changePasswordSchema, loginSchema, passwordSchema, patientSchema, surgerySchema, userCreateSchema } from '@/schemas';

const base = { origem: 'Eletivo', patient: 'MARIA SOUZA', type: 'APEN-01 - Apendicectomia', date: '2026-11-20' };

describe('validação (zod)', () => {
  it('cirurgia válida e inválidas', () => {
    expect(surgerySchema.safeParse(base).success).toBe(true);
    expect(surgerySchema.safeParse({ ...base, patient: 'ab' }).success).toBe(false);
    expect(surgerySchema.safeParse({ ...base, date: '20/11/2026' }).success).toBe(false);
    expect(surgerySchema.safeParse({ ...base, type: '' }).success).toBe(false);
  });
  it('mutirão exige nome', () => {
    expect(surgerySchema.safeParse({ ...base, origem: 'Mutirão' }).success).toBe(false);
    expect(surgerySchema.safeParse({ ...base, origem: 'Mutirão', mutiraoNome: 'Mutirão X' }).success).toBe(true);
  });
  it('login', () => {
    expect(loginSchema.safeParse({ identifier: 'ab', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: 'maria.s', password: 'x' }).success).toBe(true);
  });
  it('política de senha', () => {
    expect(passwordSchema.safeParse('curta1').success).toBe(false);
    expect(passwordSchema.safeParse('somenteletrasaqui').success).toBe(false);
    expect(passwordSchema.safeParse('senhaForte2026').success).toBe(true);
  });
  it('troca de senha exige confirmação e senha diferente', () => {
    expect(changePasswordSchema.safeParse({ current: 'antiga12345', next: 'novaSenha2026', confirm: 'outra' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: 'senhaIgual123', next: 'senhaIgual123', confirm: 'senhaIgual123' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: 'antiga12345', next: 'novaSenha2026', confirm: 'novaSenha2026' }).success).toBe(true);
  });
  it('usuário clínica exige clínica; login em formato seguro', () => {
    const u = { name: 'Fulano Tal', username: 'fulano', role: 'clinica', password: 'senhaForte2026' };
    expect(userCreateSchema.safeParse(u).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...u, clinicaId: 'pediatria' }).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...u, role: 'admin', username: 'a b!' }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...u, role: 'superuser' }).success).toBe(false);
  });
  it('paciente: CPF e campos obrigatórios', () => {
    expect(patientSchema.safeParse({ nome: 'Maria Souza', prontuario: '1', cpf: '123' }).success).toBe(false);
    expect(patientSchema.safeParse({ nome: 'Maria Souza', prontuario: '1', cpf: '123.456.789-09' }).success).toBe(true);
    expect(patientSchema.safeParse({ nome: 'Maria Souza', prontuario: '' }).success).toBe(false);
  });
  it('falta', () => expect(absenceSchema.safeParse({ patient: 'João Silva', date: '2026-11-01' }).success).toBe(true));
});
