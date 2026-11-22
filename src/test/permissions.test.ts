import { describe, expect, it } from 'vitest';
import { can, homeFor, isKioskRole, ROLE_FEATURES } from '@/utils/permissions';
import { ROLES } from '@/types';

describe('permissões por perfil', () => {
  it('admin pode tudo; diretor não gerencia usuários nem configurações', () => {
    expect(can('admin', 'usuarios')).toBe(true);
    expect(can('diretor', 'usuarios')).toBe(false);
    expect(can('diretor', 'configuracoes')).toBe(false);
    expect(can('diretor', 'lgpd')).toBe(true);
  });
  it('clínica só acessa o próprio portal', () => {
    expect(ROLE_FEATURES.clinica).toEqual(['home', 'clinicas']);
    expect(can('clinica', 'cirurgias.ver')).toBe(false);
    expect(can('clinica', 'pacientes.ver')).toBe(false);
  });
  it('enfermagem altera status mas não registra, exclui nem edita prontuário', () => {
    expect(can('enfermagem', 'cirurgias.status')).toBe(true);
    expect(can('enfermagem', 'cirurgias.registrar')).toBe(false);
    expect(can('enfermagem', 'cirurgias.excluir')).toBe(false);
    expect(can('enfermagem', 'pacientes.editar')).toBe(false);
  });
  it('faturamento: somente leitura, sem prontuários', () => {
    expect(can('faturamento', 'relatorios')).toBe(true);
    expect(can('faturamento', 'pacientes.ver')).toBe(false);
    expect(can('faturamento', 'cirurgias.status')).toBe(false);
  });
  it('contas de painel só veem o respectivo painel', () => {
    expect(ROLE_FEATURES.painel_tv).toEqual(['painel_tv']);
    expect(ROLE_FEATURES.painel_espera).toEqual(['painel_espera']);
    expect(isKioskRole('painel_tv')).toBe(true);
    expect(isKioskRole('admin')).toBe(false);
  });
  it('nenhum perfil exceto admin gerencia usuários; sem perfil não há acesso', () => {
    for (const r of ROLES) expect(can(r, 'usuarios')).toBe(r === 'admin');
    expect(can(undefined, 'dashboard')).toBe(false);
  });
  it('centro cirúrgico acessa os dois painéis; enfermagem e faturamento não', () => {
    expect(can('cirurgico', 'painel_tv')).toBe(true); expect(can('cirurgico', 'painel_espera')).toBe(true);
    expect(can('enfermagem', 'painel_tv')).toBe(false); expect(can('faturamento', 'painel_tv')).toBe(false);
    expect(can('cirurgico', 'cirurgias.registrar')).toBe(true);
  });
  it('página inicial por perfil', () => {
    expect(homeFor('clinica')).toBe('/home');
    expect(homeFor('painel_tv')).toBe('/painel-tv');
    expect(homeFor('admin')).toBe('/home');
  });
});
