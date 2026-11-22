import { useEffect, useState } from 'react';
import type { Surgery } from '@/types';
import { loadSurgeriesRange, recentFrom, subscribeSurgeriesFrom } from '@/services/database/surgeries';
import { friendlyError } from '@/utils/errors';
import { useSubscription } from './useSubscription';

/**
 * Cirurgias em TEMPO REAL a partir de `minDate`: baixa só a janela recente (últimos 30 dias + futuras) e,
 * se a tela pedir uma data mais antiga, amplia a janela. `null` = todas (só quando a pessoa pede).
 */
export function useSurgeriesLive(minDate?: string | null) {
  const base = recentFrom();
  const from = minDate === null ? null : minDate && minDate < base ? minDate : base;
  return useSubscription<Surgery[]>((cb, e) => subscribeSurgeriesFrom(from, cb, e), [], [from]);
}

/** Cirurgias de um período, lidas uma vez (relatórios/indicadores/faturamento). */
export function useSurgeriesOnce(from: string | null, to: string | null) {
  const [state, setState] = useState<{ data: Surgery[]; loading: boolean; error: string | null }>({ data: [], loading: true, error: null });
  useEffect(() => {
    let vivo = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadSurgeriesRange(from, to).then((data) => vivo && setState({ data, loading: false, error: null }))
      .catch((e) => vivo && setState({ data: [], loading: false, error: friendlyError(e, 'Não foi possível carregar os dados.') }));
    return () => { vivo = false; };
  }, [from, to]);
  return state;
}
