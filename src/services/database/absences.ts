import { ref, remove } from 'firebase/database';
import { db } from '../firebase/app';

/**
 * Remove uma falta. As regras do banco só permitem a remoção a admin/diretor
 * (mesma matriz da funcionalidade 'cirurgias.excluir').
 */
export async function removeAbsence(id: string): Promise<void> {
  await remove(ref(db, `absences/${id}`));
}
