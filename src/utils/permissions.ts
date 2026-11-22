import type { Role } from '@/types';

/** Funcionalidades protegidas. A mesma matriz é aplicada (de forma independente) nas regras do banco. */
export type Feature =
  | 'home' | 'dashboard' | 'cirurgias.ver' | 'cirurgias.registrar' | 'cirurgias.status' | 'cirurgias.excluir'
  | 'pacientes.ver' | 'pacientes.editar' | 'faltas.ver' | 'faltas.editar' | 'relatorios'
  | 'auditoria' | 'usuarios' | 'configuracoes' | 'lgpd' | 'clinicas' | 'painel_tv' | 'painel_espera';

const ALL: Feature[] = [
  'home', 'dashboard', 'cirurgias.ver', 'cirurgias.registrar', 'cirurgias.status', 'cirurgias.excluir', 'pacientes.ver',
  'pacientes.editar', 'faltas.ver', 'faltas.editar', 'relatorios', 'auditoria', 'usuarios', 'configuracoes', 'lgpd', 'clinicas', 'painel_tv', 'painel_espera'
];

export const ROLE_FEATURES: Record<Role, Feature[]> = {
  admin: ALL,
  diretor: ALL.filter((f) => f !== 'usuarios' && f !== 'configuracoes'),
  cirurgico: ['home', 'cirurgias.ver', 'cirurgias.registrar', 'cirurgias.status', 'pacientes.ver', 'pacientes.editar', 'faltas.ver', 'faltas.editar', 'painel_tv', 'painel_espera'],
  enfermagem: ['home', 'cirurgias.ver', 'cirurgias.status', 'pacientes.ver', 'faltas.ver'],
  faturamento: ['home', 'dashboard', 'cirurgias.ver', 'faltas.ver', 'relatorios'],
  clinica: ['home', 'clinicas'],
  painel_tv: ['painel_tv'],
  painel_espera: ['painel_espera']
};

export function can(role: Role | undefined, feature: Feature): boolean {
  return !!role && ROLE_FEATURES[role]?.includes(feature);
}

/** Página inicial de cada perfil. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'painel_tv': return '/painel-tv';
    case 'painel_espera': return '/painel-espera';
    default: return '/home';
  }
}

/** Papéis que só exibem painéis (sessão persistente, sem tempo de inatividade). */
export function isKioskRole(role: Role | undefined): boolean {
  return role === 'painel_tv' || role === 'painel_espera';
}
