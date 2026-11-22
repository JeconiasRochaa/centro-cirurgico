// Tipos de domínio. Mantêm compatibilidade com o formato dos dados já existentes no Realtime Database.

export const ROLES = ['admin', 'diretor', 'cirurgico', 'enfermagem', 'faturamento', 'clinica', 'painel_tv', 'painel_espera'] as const;
export type Role = (typeof ROLES)[number];

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email?: string;
  role: Role;
  active: boolean;
  /** Obrigatório para o papel "clinica": identifica a clínica/setor solicitante. */
  clinicaId?: string;
  mustChangePassword?: boolean;
  /** Versão do aviso de privacidade/termo de uso aceito pelo usuário. */
  termoVersao?: string;
  termoAceitoEm?: number;
  createdAt?: number;
}

export const SURGERY_STATUSES = ['pendente', 'em_preparacao', 'em_andamento', 'recuperacao', 'concluida', 'suspensa', 'cancelada'] as const;
export type SurgeryStatus = (typeof SURGERY_STATUSES)[number];

export type YesNoMaybe = 'sim' | 'nao' | 'talvez';

export interface Surgery {
  id: string;
  code?: string | null;
  origem?: string;
  mutiraoNome?: string;
  patient: string;
  prontuario?: string;
  birthDate?: string;
  age?: string | number;
  /** Procedimentos, um por linha, no formato "CÓDIGO - NOME". */
  type: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  specialty?: string;
  doctor?: string;
  instrumentador?: string;
  circulante?: string; // legado
  anesthetist?: string;
  room?: string;
  necessitaSangue?: YesNoMaybe;
  necessitaUTI?: YesNoMaybe;
  materiaisEspeciais?: string;
  observacoes?: string;
  status: SurgeryStatus;
  cancelReason?: string | null;
  suspendReason?: string | null;
  /** Clínica solicitante (slug). Obrigatório em solicitações vindas das clínicas. */
  clinicaId?: string;
  setorSolicitante?: string; // legado
  clinicaOrigem?: string; // legado (nome de exibição)
  dataSolicitacao?: string;
  // Rastreabilidade (LGPD) — preenchidos no envio e validados pelas regras
  updatedBy?: string;
  updatedAt?: number;
  createdBy?: string;
  // Exclusão lógica (nunca apagamos registros hospitalares)
  deletedAt?: number | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

export interface PatientRecord {
  nome: string;
  prontuario: string;
  dataNascimento?: string;
  idade?: string | number;
  sexo?: string;
  cpf?: string;
  contato?: string;
  endereco?: string;
  tipoSanguineo?: string;
  alergias?: string;
  observacoes?: string;
  emergenciaNome?: string;
  emergenciaTelefone?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
  updatedBy?: string;
  updatedAt?: number;
}

export interface Absence {
  id: string;
  patient: string;
  date: string;
  municipio?: string;
  procedure?: string;
  reason?: string;
  registradoPor?: string;
  criadoEm?: string;
  updatedBy?: string;
  updatedAt?: number;
}

export interface Doctor { name: string; crm: string }

export interface AuditLog {
  id?: string;
  /** Instante (servidor). */
  ts: number;
  uid: string;
  username?: string;
  role?: Role;
  action: string;
  entity: string;
  entityId?: string;
  /** Apenas nomes dos campos alterados — nunca os valores (minimização). */
  fields?: string[];
  result: 'ok' | 'denied' | 'error';
  detail?: string;
}

/** Espelho minimizado exibido na TV do centro cirúrgico (acesso só para contas de painel/equipe). */
export interface PainelTVItem {
  id: string; date: string; time?: string; room?: string; status: SurgeryStatus;
  patient?: string; age?: number; origem?: string; clinicaOrigem?: string; type?: string;
  specialty?: string; doctor?: string; instrumentador?: string; anesthetist?: string;
  necessitaSangue?: string; necessitaUTI?: string;
}

/** Espelho minimizado da sala de espera: só o nome abreviado. */
export interface PainelEsperaItem {
  id: string; date: string; time?: string; room?: string; status: SurgeryStatus; patientDisplay?: string;
}
