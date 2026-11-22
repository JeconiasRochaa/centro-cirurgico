import { get, ref, update } from 'firebase/database';
import { db } from '../firebase/app';
import type { Surgery } from '@/types';
import { mirrorFor } from '@/utils/mirror';
import { todayISO } from '@/utils/format';

type Rec = Record<string, unknown>;
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Rec).sort(([a], [b]) => a.localeCompare(b))) : x));

/**
 * Mantém os painéis atualizados a partir do navegador da equipe (admin/diretor/centro cirúrgico), SEM depender das Cloud Functions.
 * Grava apenas os campos minimizados (as regras do banco rejeitam qualquer outro campo) e só o que mudou. É idempotente: se as
 * Cloud Functions também estiverem publicadas, ambas produzem exatamente o mesmo conteúdo.
 */
export async function syncPainelMirrors(surgeries: Surgery[], tvNomeCompleto: boolean): Promise<number> {
  const today = todayISO();
  const [tvSnap, espSnap] = await Promise.all([get(ref(db, 'painel_tv')), get(ref(db, 'painel_espera'))]);
  const curTV = (tvSnap.val() ?? {}) as Record<string, Rec>;
  const curEsp = (espSnap.val() ?? {}) as Record<string, Rec>;
  const updates: Record<string, Rec | null> = {};
  const wantTV = new Set<string>(); const wantEsp = new Set<string>();

  for (const s of surgeries) {
    const m = mirrorFor(s.id, s as unknown as Rec, today, tvNomeCompleto);
    if (m.tv) { wantTV.add(s.id); if (stable(curTV[s.id]) !== stable(m.tv)) updates[`painel_tv/${s.id}`] = m.tv; }
    if (m.espera) { wantEsp.add(s.id); if (stable(curEsp[s.id]) !== stable(m.espera)) updates[`painel_espera/${s.id}`] = m.espera; }
  }
  for (const id of Object.keys(curTV)) if (!wantTV.has(id)) updates[`painel_tv/${id}`] = null;
  for (const id of Object.keys(curEsp)) if (!wantEsp.has(id)) updates[`painel_espera/${id}`] = null;

  const n = Object.keys(updates).length;
  if (n) await update(ref(db), updates);
  return n;
}
