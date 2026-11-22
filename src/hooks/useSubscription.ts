import { useEffect, useState } from 'react';
import { friendlyError } from '@/utils/errors';

interface State<T> { data: T; loading: boolean; error: string | null }

/** Assina um serviço em tempo real: `subscribe(cb, onError) => unsubscribe`. */
export function useSubscription<T>(subscribe: (cb: (v: T) => void, onError: (e: Error) => void) => () => void, initial: T, deps: unknown[] = []): State<T> {
  const [state, setState] = useState<State<T>>({ data: initial, loading: true, error: null });
  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const un = subscribe(
      (data) => setState({ data, loading: false, error: null }),
      (e) => setState((s) => ({ ...s, loading: false, error: friendlyError(e, 'Não foi possível carregar os dados.') }))
    );
    return un;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
