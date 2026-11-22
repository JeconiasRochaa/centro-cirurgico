import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/common';
import { homeFor, type Feature } from '@/utils/permissions';
import { TERMO_VERSAO } from '@/utils/constants';
import { isKioskRole } from '@/utils/permissions';

/**
 * Protege rotas: exige sessão válida, troca de senha pendente, aceite do termo de privacidade e permissão.
 * ATENÇÃO: isto é apenas experiência de uso — a proteção real dos dados está nas regras do banco e nas Cloud Functions.
 */
export function ProtectedRoute({ feature }: { feature?: Feature }) {
  const { profile, loading, can } = useAuth();
  const loc = useLocation();

  if (loading) return <Spinner label="Verificando sessão..." />;
  if (!profile) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;

  const kiosk = isKioskRole(profile.role);
  if (profile.mustChangePassword && loc.pathname !== '/trocar-senha') return <Navigate to="/trocar-senha" replace />;
  if (!kiosk && profile.termoVersao !== TERMO_VERSAO && loc.pathname !== '/termo' && loc.pathname !== '/trocar-senha') return <Navigate to="/termo" replace />;
  if (feature && !can(feature)) return <Navigate to={homeFor(profile.role)} replace />;
  return <Outlet />;
}
