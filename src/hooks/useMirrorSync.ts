import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeLgpdSettings } from '@/services/database/others';
import { subscribeSurgeries } from '@/services/database/surgeries';
import { syncPainelMirrors } from '@/services/database/mirrorSync';
import type { Surgery } from '@/types';

/** Para a equipe que gerencia cirurgias: sincroniza os espelhos dos painéis sempre que as cirurgias mudam (e na virada do dia). */
export function useMirrorSync() {
  const { profile } = useAuth();
  const enabled = !!profile && ['admin', 'diretor', 'cirurgico'].includes(profile.role);
  const data = useRef<{ list: Surgery[] | null; full: boolean | null }>({ list: null, full: null });
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const { list, full } = data.current;
        if (list && full !== null) void syncPainelMirrors(list, full).catch((e) => console.warn('Sincronização dos painéis falhou:', (e as Error).message));
      }, 1500);
    };
    const u1 = subscribeSurgeries((l) => { data.current.list = l; run(); });
    const u2 = subscribeLgpdSettings((s) => { data.current.full = s.tvNomeCompleto; run(); });
    const midnight = window.setInterval(run, 10 * 60_000); // revalida a cada 10 min (remove itens de dias anteriores)
    return () => { u1(); u2(); window.clearInterval(midnight); window.clearTimeout(timer.current); };
  }, [enabled]);
}
