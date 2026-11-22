import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lerUmaVez, resetarAssinaturas, sharedLive } from '@/services/database/shared';

describe('assinaturas compartilhadas (economia de downloads, mantendo o tempo real)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { resetarAssinaturas(); vi.useRealTimers(); });

  const fonte = () => {
    let emitir: (v: number) => void = () => undefined;
    const parar = vi.fn();
    const iniciar = vi.fn((e: (v: number) => void) => { emitir = e; return parar; });
    return { iniciar, parar, emitir: (v: number) => emitir(v) };
  };

  it('duas telas com a mesma consulta usam uma só conexão', () => {
    const f = fonte(); const a = vi.fn(); const b = vi.fn();
    sharedLive('k', f.iniciar, a); sharedLive('k', f.iniciar, b);
    expect(f.iniciar).toHaveBeenCalledTimes(1);
    f.emitir(1);
    expect(a).toHaveBeenCalledWith(1); expect(b).toHaveBeenCalledWith(1);
  });

  it('ao voltar para a tela em até 3 min, entrega os dados da memória sem nova conexão e segue em tempo real', () => {
    const f = fonte(); const a = vi.fn(); const b = vi.fn();
    const sair = sharedLive('k', f.iniciar, a);
    f.emitir(1); sair();
    vi.advanceTimersByTime(60_000);
    sharedLive('k', f.iniciar, b);
    expect(f.iniciar).toHaveBeenCalledTimes(1);
    expect(f.parar).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith(1);
    f.emitir(2);
    expect(b).toHaveBeenLastCalledWith(2);
  });

  it('depois de 3 min sem ninguém usando, encerra a conexão', () => {
    const f = fonte(); const sair = sharedLive('k', f.iniciar, vi.fn());
    sair(); vi.advanceTimersByTime(3 * 60_000 + 10);
    expect(f.parar).toHaveBeenCalledTimes(1);
  });

  it('ao sair da conta, encerra tudo e apaga os dados da memória', async () => {
    const f = fonte(); const a = vi.fn();
    sharedLive('k', f.iniciar, a); f.emitir(7);
    resetarAssinaturas();
    expect(f.parar).toHaveBeenCalledTimes(1);
    const b = vi.fn(); const g = fonte();
    sharedLive('k', g.iniciar, b);
    expect(b).not.toHaveBeenCalled(); // não herda dados do usuário anterior
    expect(g.iniciar).toHaveBeenCalledTimes(1);
  });

  it('leitura única reaproveita o resultado por alguns minutos', async () => {
    const carregar = vi.fn(async () => 5);
    await lerUmaVez('x', carregar); await lerUmaVez('x', carregar);
    expect(carregar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3 * 60_000);
    await lerUmaVez('x', carregar);
    expect(carregar).toHaveBeenCalledTimes(2);
  });
});
