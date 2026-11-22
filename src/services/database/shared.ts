/**
 * Assinaturas em tempo real COMPARTILHADAS e com "permanência":
 *  - várias telas que pedem a mesma consulta usam UMA só conexão com o banco;
 *  - ao sair de uma tela, a conexão continua por mais alguns minutos. Se a pessoa voltar logo (ex.: navegando pelo menu),
 *    os dados já estão na memória e NÃO são baixados de novo — só chegam as mudanças, continuando em tempo real.
 * Isto reduz muito o consumo de "downloads" do Realtime Database sem perder a atualização instantânea.
 */
const PERMANENCIA_MS = 3 * 60_000;

interface Entrada<T> {
  subs: Set<(v: T) => void>;
  errs: Set<(e: Error) => void>;
  ultimo?: { v: T };
  parar?: () => void;
  timer?: number;
}
const registro = new Map<string, Entrada<unknown>>();

export function sharedLive<T>(
  chave: string,
  iniciar: (emitir: (v: T) => void, falhar: (e: Error) => void) => () => void,
  cb: (v: T) => void,
  onError?: (e: Error) => void,
): () => void {
  let ent = registro.get(chave) as Entrada<T> | undefined;
  if (!ent) { ent = { subs: new Set(), errs: new Set() }; registro.set(chave, ent as Entrada<unknown>); }
  const e = ent;
  if (e.timer !== undefined) { window.clearTimeout(e.timer); e.timer = undefined; }
  e.subs.add(cb);
  if (onError) e.errs.add(onError);
  if (!e.parar) {
    e.parar = iniciar(
      (v) => { e.ultimo = { v }; [...e.subs].forEach((f) => f(v)); },
      (err) => { [...e.errs].forEach((f) => f(err)); e.parar?.(); e.parar = undefined; e.ultimo = undefined; },
    );
  } else if (e.ultimo) {
    cb(e.ultimo.v);
  }
  return () => {
    e.subs.delete(cb);
    if (onError) e.errs.delete(onError);
    if (e.subs.size === 0 && e.timer === undefined) {
      e.timer = window.setTimeout(() => { e.parar?.(); e.parar = undefined; if (registro.get(chave) === (e as Entrada<unknown>)) registro.delete(chave); }, PERMANENCIA_MS);
    }
  };
}

/** Leitura única com cache curto (relatórios/indicadores não precisam de tempo real). */
const unicos = new Map<string, { t: number; p: Promise<unknown> }>();
export function lerUmaVez<T>(chave: string, carregar: () => Promise<T>, ttlMs = 2 * 60_000): Promise<T> {
  const c = unicos.get(chave);
  if (c && Date.now() - c.t < ttlMs) return c.p as Promise<T>;
  const p = carregar();
  unicos.set(chave, { t: Date.now(), p });
  p.catch(() => unicos.delete(chave));
  return p;
}

/** Ao sair da conta: encerra tudo e apaga os dados da memória (nada fica para o próximo usuário). */
export function resetarAssinaturas() {
  registro.forEach((e) => { if (e.timer !== undefined) window.clearTimeout(e.timer); e.parar?.(); });
  registro.clear();
  unicos.clear();
}
