import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Verificação ESTÁTICA do arquivo de regras (não substitui testes no Emulator Suite).
const rules = JSON.parse(readFileSync(resolve(__dirname, '../../database.rules.json'), 'utf8')).rules;
const walk = (n: unknown, path: string, out: { path: string; k: string; v: unknown }[] = []) => {
  if (n && typeof n === 'object') for (const [k, v] of Object.entries(n)) { if (k === '.read' || k === '.write') out.push({ path, k, v }); else walk(v, `${path}/${k}`, out); }
  return out;
};

describe('regras do Realtime Database (análise estática)', () => {
  const all = walk(rules, '');
  it('nenhuma regra pública (true) de leitura/escrita', () => expect(all.filter((r) => r.v === true)).toEqual([]));
  it('raiz sem leitura/escrita', () => { expect(rules['.read']).toBe(false); expect(rules['.write']).toBe(false); });
  const denied = (n: Record<string, unknown>) => n['.write'] === undefined || n['.write'] === false;
  it('perfis: cliente só grava mustChangePassword (para false) e aceite do termo', () => {
    expect(denied(rules.users)).toBe(true);
    const writable = Object.entries(rules.users['$uid']).filter(([k, v]) => !k.startsWith('.') && (v as Record<string, unknown>)['.write'] !== undefined).map(([k]) => k).sort();
    expect(writable).toEqual(['mustChangePassword', 'termoAceitoEm', 'termoVersao']);
  });
  it('auditoria não é gravável pelo cliente (somente Cloud Functions)', () => expect(denied(rules.audit_logs)).toBe(true));
  it('espelhos dos painéis: só equipe grava, apenas por item e com campos restritos', () => {
    for (const k of ['painel_tv', 'painel_espera']) {
      expect(denied(rules[k])).toBe(true);
      const w = String(rules[k]['$id']['.write']);
      expect(w).toMatch(/admin/); expect(w).not.toMatch(/clinica|faturamento|painel_tv'|painel_espera'/);
      expect(rules[k]['$id']['$other']['.validate']).toBe(false);
      expect(rules[k]['$id'].cpf).toBeUndefined(); expect(rules[k]['$id'].prontuario).toBeUndefined();
    }
  });
  it('perfis: só admin grava, nunca o próprio', () => {
    const w = String(rules.users['$uid']['.write']);
    expect(w).toMatch(/'admin'/); expect(w).toContain('$uid !== auth.uid');
  });
  it('trilha de acesso é somente inclusão', () => expect(String(rules.access_logs['$id']['.write'])).toContain('!data.exists()'));
});
