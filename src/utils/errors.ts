/** Tratamento centralizado de erros: converte erros do Firebase em mensagens seguras (sem detalhes internos). */
export class AppError extends Error {
  constructor(message: string, public code = 'app/error') { super(message); }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Usuário ou senha inválidos.',
  'auth/user-not-found': 'Usuário ou senha inválidos.',
  'auth/wrong-password': 'Usuário ou senha inválidos.',
  'auth/invalid-email': 'Usuário ou senha inválidos.',
  'auth/user-disabled': 'Este usuário está desativado. Procure o administrador.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente novamente.',
  'auth/requires-recent-login': 'Por segurança, entre novamente para concluir esta operação.',
  'auth/weak-password': 'A senha é fraca demais. Use uma senha mais longa.',
  'auth/email-already-in-use': 'Já existe um usuário com este login/e-mail.',
  'PERMISSION_DENIED': 'Você não tem permissão para esta operação.',
  'functions/permission-denied': 'Você não tem permissão para esta operação.',
  'functions/unauthenticated': 'Sessão expirada. Entre novamente.',
  'functions/invalid-argument': 'Dados inválidos. Revise o formulário.',
  'functions/already-exists': 'Já existe um registro com estes dados.',
  'functions/failed-precondition': 'Operação não permitida no estado atual do registro.',
  'functions/unavailable': 'Serviço indisponível no momento. Tente novamente.'
};

export function errorCode(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { code?: unknown; message?: unknown };
    if (typeof e.code === 'string') return e.code;
    if (typeof e.message === 'string' && /permission[_ ]denied/i.test(e.message)) return 'PERMISSION_DENIED';
  }
  return 'unknown';
}

export function friendlyError(err: unknown, fallback = 'Não foi possível concluir a operação. Tente novamente.'): string {
  if (err instanceof AppError) return err.message;
  const code = errorCode(err);
  if (MESSAGES[code]) return MESSAGES[code];
  // Mensagens de funções "HttpsError" são escritas por nós e seguras para exibir.
  if (code.startsWith('functions/') && err instanceof Error && err.message && err.message.length < 200) return err.message;
  return fallback;
}
