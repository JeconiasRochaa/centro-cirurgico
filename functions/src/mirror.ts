import { db, todayLocal } from './lib';
import { mirrorFor } from './mirrorPure';
export { mirrorFor, abbreviateName } from './mirrorPure';
type Rec = Record<string, unknown>;

export async function tvNomeCompleto(): Promise<boolean> {
  return (await db.ref('settings/lgpd/tvNomeCompleto').get()).val() === true;
}

export async function writeMirror(id: string, x: Rec | null): Promise<void> {
  const m = mirrorFor(id, x, todayLocal(), await tvNomeCompleto());
  await db.ref().update({ [`painel_tv/${id}`]: m.tv, [`painel_espera/${id}`]: m.espera });
}
