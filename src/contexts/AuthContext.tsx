import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, IDLE_TIMEOUT_MIN } from '@/services/firebase/app';
import { resetarAssinaturas } from '@/services/database/shared';
import { loadProfile, login as doLogin, logout as doLogout } from '@/services/auth/authService';
import type { UserProfile } from '@/types';
import { can, isKioskRole, type Feature } from '@/utils/permissions';

interface AuthState {
  profile: UserProfile | null;
  loading: boolean;
  /** true quando a sessão foi encerrada por inatividade (mostra aviso no login). */
  expired: boolean;
  login: (identifier: string, password: string, persistent?: boolean) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: (feature: Feature) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { resetarAssinaturas(); setProfile(null); setLoading(false); return; }
      try {
        const p = await loadProfile(user);
        if (!p) { await doLogout(); setProfile(null); } else setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (identifier: string, password: string, persistent = false) => {
    setExpired(false);
    const p = await doLogin(identifier, password, persistent);
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(async () => { await doLogout(); setProfile(null); }, []);

  const refreshProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    const p = await loadProfile(u);
    setProfile(p);
  }, []);

  // Encerramento automático por inatividade (não se aplica às contas de painel/TV).
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!profile || isKioskRole(profile.role)) return;
    const ms = IDLE_TIMEOUT_MIN * 60_000;
    const reset = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        // Abas de painel (TV/sala de espera) ficam ligadas sem interação: não encerram a sessão por inatividade.
        if (window.location.pathname.startsWith('/painel-')) { reset(); return; }
        setExpired(true); await doLogout(); setProfile(null);
      }, ms);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { events.forEach((e) => window.removeEventListener(e, reset)); window.clearTimeout(timer.current); };
  }, [profile]);

  const value = useMemo<AuthState>(() => ({
    profile, loading, expired, login, logout, refreshProfile, can: (f) => can(profile?.role, f)
  }), [profile, loading, expired, login, logout, refreshProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return v;
}
