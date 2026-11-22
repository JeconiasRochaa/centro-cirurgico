import type { SurgeryStatus } from '@/types';

/** Fluxo de uma cirurgia: um clique avança para a próxima etapa. */
export const ADVANCE: Partial<Record<SurgeryStatus, { to: SurgeryStatus; label: string }>> = {
  pendente: { to: 'em_preparacao', label: 'Iniciar preparo' },
  em_preparacao: { to: 'em_andamento', label: 'Iniciar cirurgia' },
  em_andamento: { to: 'recuperacao', label: 'Enviar p/ recuperação' },
  recuperacao: { to: 'concluida', label: 'Finalizar' },
  suspensa: { to: 'pendente', label: 'Reagendar' }
};
export const BACK: Partial<Record<SurgeryStatus, SurgeryStatus>> = {
  em_preparacao: 'pendente', em_andamento: 'em_preparacao', recuperacao: 'em_andamento', concluida: 'recuperacao'
};
