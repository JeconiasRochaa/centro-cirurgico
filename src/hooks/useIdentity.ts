import { useSubscription } from './useSubscription';
import { subscribeIdentity, type Identity } from '@/services/database/others';

const DEFAULT: Identity = { systemName: 'ExaGestão', hospitalName: 'Hospital Regional de Palmeira dos Índios', salaEsperaAtiva: true };
export function useIdentity(): Identity {
  return useSubscription<Identity>((cb, err) => subscribeIdentity(cb, err), DEFAULT).data;
}
