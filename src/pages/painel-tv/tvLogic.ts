import type { PainelTVItem, SurgeryStatus } from '@/types';

/** Ordem de exibição na TV (menor = mais acima). */
export const TV_STATUS_ORDER: Record<SurgeryStatus, number> = {
  em_andamento: 1, em_preparacao: 2, pendente: 3, recuperacao: 4, concluida: 5, suspensa: 6, cancelada: 7
};

export function sortForTV(items: PainelTVItem[]): PainelTVItem[] {
  return [...items].sort((a, b) => {
    const sa = TV_STATUS_ORDER[a.status] ?? 8;
    const sb = TV_STATUS_ORDER[b.status] ?? 8;
    if (sa !== sb) return sa - sb;
    return (a.time ?? '').localeCompare(b.time ?? '');
  });
}

export interface TVCounts { andamento: number; finalizadas: number; aguardando: number; canceladas: number }

export function countStatuses(items: PainelTVItem[]): TVCounts {
  const c: TVCounts = { andamento: 0, finalizadas: 0, aguardando: 0, canceladas: 0 };
  for (const s of items) {
    if (s.status === 'em_andamento' || s.status === 'em_preparacao' || s.status === 'recuperacao') c.andamento++;
    else if (s.status === 'concluida') c.finalizadas++;
    else if (s.status === 'pendente') c.aguardando++;
    else if (s.status === 'cancelada' || s.status === 'suspensa') c.canceladas++;
  }
  return c;
}

/** Siglas das clínicas (nome atual e grafia legada, sem acentos). */
const CLINICA_SIGLAS: Record<string, string> = {
  'Clínica Médica I': 'CM I', 'Clínica Médica II': 'CM II', 'Clínica Cirúrgica': 'CC', Pediatria: 'PED',
  'Oncologia I': 'ONC I', 'Oncologia II': 'ONC II', Emergência: 'EMERG', 'Área Vermelha': 'AV',
  'UTI I': 'UTI I', 'UTI II': 'UTI II', Outros: 'OUTROS',
  'Clinica Medica I': 'CM I', 'Clinica Medica II': 'CM II', 'Clinica Cirurgica': 'CC', Emergencia: 'EMERG', 'Area Vermelha': 'AV'
};
export function clinicaSigla(nome?: string): string {
  if (!nome) return '';
  return CLINICA_SIGLAS[nome] ?? nome;
}

const ORIGEM_CURTA: Record<string, string> = {
  Interno: 'Interno', Eletivo: 'Eletivo', 'CR - Bucomaxilofacial': 'CR Bucomaxilo', 'Solicitação Externa': 'Solic. Externa',
  Transferência: 'Transferência', 'Urgência/Emergência': 'Urg/Emerg', Mutirão: 'Mutirão'
};
export function origemCurta(origem?: string): string {
  if (!origem) return '-';
  return ORIGEM_CURTA[origem] ?? origem;
}

export function yesNoLabel(v?: string): { label: string; yes: boolean } {
  const x = (v ?? 'nao').toLowerCase();
  if (x === 'sim') return { label: 'Sim', yes: true };
  if (x === 'talvez') return { label: 'Possível', yes: false };
  return { label: 'Não', yes: false };
}

/** Minutos (inteiro, arredondado para baixo) até o horário `HH:mm` do dia `dateISO`; null se o horário for inválido. */
export function minutesUntil(dateISO: string, time: string | undefined, now: Date): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const [y, mo, d] = dateISO.split('-').map(Number);
  const start = new Date(y, (mo ?? 1) - 1, d ?? 1, Number(m[1]), Number(m[2]), 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  return Math.floor((start.getTime() - now.getTime()) / 60000);
}

/** Cirurgias pendentes de hoje cuja hora de início está entre 9 e 11 minutos. */
export function dueForNotice(items: PainelTVItem[], today: string, now: Date): PainelTVItem[] {
  return items.filter((s) => {
    if (s.date !== today || s.status !== 'pendente') return false;
    const d = minutesUntil(today, s.time, now);
    return d !== null && d >= 9 && d <= 11;
  });
}

/** Cirurgias futuras (data posterior a hoje) não canceladas, em ordem cronológica. */
export function upcoming(items: PainelTVItem[], today: string): PainelTVItem[] {
  return items
    .filter((s) => s.date > today && s.status !== 'cancelada')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}
