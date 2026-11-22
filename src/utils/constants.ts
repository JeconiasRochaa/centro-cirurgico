import type { Role, SurgeryStatus } from '@/types';

export const SALAS = ['SALA A', 'SALA B', 'SALA C', 'SALA D', 'SALA E'] as const;
export const ESPECIALIDADES = ['Cirurgia Geral', 'Ortopedia', 'Coloproctologia', 'Bucomaxilofacial', 'Outra'] as const;
export const ORIGENS = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Eletivo', label: 'Eletivo' },
  { value: 'CR - Bucomaxilofacial', label: 'CR - Bucomaxilofacial' },
  { value: 'Solicitação Externa', label: 'Solicitação Externa (Outra Unidade)' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Urgência/Emergência', label: 'Urgência/Emergência' },
  { value: 'Mutirão', label: 'Mutirão' }
] as const;

export const STATUS_LABELS: Record<SurgeryStatus, string> = {
  pendente: 'Aguardando', em_preparacao: 'Em Preparação', em_andamento: 'Em Andamento',
  recuperacao: 'Recuperação', concluida: 'Finalizada', suspensa: 'Suspensa', cancelada: 'Cancelada'
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador', diretor: 'Diretor(a)', cirurgico: 'Centro Cirúrgico', enfermagem: 'Enfermagem',
  faturamento: 'Faturamento', clinica: 'Clínica solicitante', painel_tv: 'Painel TV (conta de exibição)',
  painel_espera: 'Painel Sala de Espera (conta de exibição)'
};

/** Clínicas/setores solicitantes. O `id` é o identificador estável gravado em `clinicaId`. */
export const CLINICAS = [
  { id: 'clinica-medica-1', nome: 'Clínica Médica I', legado: 'Clinica Medica I' },
  { id: 'clinica-medica-2', nome: 'Clínica Médica II', legado: 'Clinica Medica II' },
  { id: 'clinica-cirurgica', nome: 'Clínica Cirúrgica', legado: 'Clinica Cirurgica' },
  { id: 'pediatria', nome: 'Pediatria', legado: 'Pediatria' },
  { id: 'oncologia-1', nome: 'Oncologia I', legado: 'Oncologia I' },
  { id: 'oncologia-2', nome: 'Oncologia II', legado: 'Oncologia II' },
  { id: 'area-vermelha', nome: 'Área Vermelha', legado: 'Area Vermelha' },
  { id: 'emergencia', nome: 'Emergência', legado: 'Emergencia' },
  { id: 'uti-1', nome: 'UTI I', legado: 'UTI I' },
  { id: 'uti-2', nome: 'UTI II', legado: 'UTI II' },
  { id: 'outros', nome: 'Outros', legado: 'Outros' }
] as const;

export function clinicaNome(id?: string): string {
  return CLINICAS.find((c) => c.id === id)?.nome ?? '';
}

/** Versão do aviso de privacidade / termo de uso. Altere ao revisar os textos para exigir novo aceite. */
export const TERMO_VERSAO = '2026-11';
export const RETENCAO_PRONTUARIO_ANOS = 20; // Lei 13.787/2018 (art. 6º)
