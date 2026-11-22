import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/app';
import type { Role } from '@/types';

/** Operações sensíveis executadas exclusivamente no servidor (Cloud Functions), que revalida identidade e perfil. */
function call<I, O>(name: string) {
  const fn = httpsCallable<I, O>(functions, name);
  return async (data: I): Promise<O> => (await fn(data)).data;
}

export interface CreateUserInput { name: string; username: string; email?: string; role: Role; clinicaId?: string; password: string; active: boolean }
export interface UpdateUserInput { uid: string; name: string; role: Role; clinicaId?: string; active: boolean; mustChangePassword: boolean }

export const apiCreateUser = call<CreateUserInput, { uid: string }>('createUser');
export const apiUpdateUser = call<UpdateUserInput, { ok: true }>('updateUser');
export const apiResetUserPassword = call<{ uid: string; password: string }, { ok: true }>('resetUserPassword');
export const apiRebuildPaineis = call<Record<string, never>, { ok: true }>('rebuildPaineis');

export interface TitularExport {
  geradoEm: string;
  criterio: string;
  pacientes: unknown[];
  cirurgias: unknown[];
  faltas: unknown[];
  acessosRegistrados: number;
}
export const apiExportTitular = call<{ prontuario?: string; nome?: string }, TitularExport>('exportTitularData');
export const apiAnonymizeTitular = call<{ patientKey: string; confirmacao: string }, { anonimizados: number }>('anonymizeTitular');
