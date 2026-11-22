import { PROCEDIMENTOS } from '@/utils/procedures';

/** Procedimento selecionado (gravado em Surgery.type como linha "CÓDIGO - NOME"). */
export interface SelectedProcedure { codigo: string; nome: string }

/** Gera um código para procedimento digitado manualmente. */
export function manualProcedureCode(now = Date.now()): string {
  return `MANUAL-${now.toString(36)}`;
}

/** Monta o campo `type` (uma linha por procedimento, "CÓDIGO - NOME"). */
export function buildProcedureType(items: SelectedProcedure[]): string {
  return items.map((p) => `${p.codigo} - ${p.nome}`).join('\n');
}

/** Faz o caminho inverso: separa as linhas de `type` em { codigo, nome }. Linhas sem código viram manuais. */
export function parseProcedureType(type?: string): SelectedProcedure[] {
  if (!type) return [];
  return type.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const idx = line.indexOf(' - ');
    if (idx === -1) return { codigo: `MANUAL-L${i}`, nome: line };
    return { codigo: line.slice(0, idx).trim(), nome: line.slice(idx + 3).trim() };
  });
}

/** Especialidade do catálogo para um código (undefined se manual/desconhecido). */
export function catalogSpecialty(codigo: string): string | undefined {
  return PROCEDIMENTOS.find((p) => p.codigo === codigo)?.especialidade;
}

/** Sugestões do catálogo: mínimo 2 caracteres, ignora os já selecionados. */
export function searchProcedures(term: string, selected: SelectedProcedure[], limit = 30) {
  const t = term.trim().toUpperCase();
  if (t.length < 2) return [];
  const chosen = new Set(selected.map((s) => s.codigo));
  return PROCEDIMENTOS.filter((p) => (p.nome.includes(t) || p.codigo.includes(t)) && !chosen.has(p.codigo)).slice(0, limit);
}
