import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Spinner } from '@/components/common';
import { ProtectedRoute } from './ProtectedRoute';
import AppLayout from '@/layouts/AppLayout';
import KioskLayout from '@/layouts/KioskLayout';
import { useAuth } from '@/contexts/AuthContext';
import { homeFor } from '@/utils/permissions';

const L = {
  Login: lazy(() => import('@/pages/auth/LoginPage')),
  Recuperar: lazy(() => import('@/pages/auth/RecuperarSenhaPage')),
  TrocarSenha: lazy(() => import('@/pages/auth/TrocarSenhaPage')),
  Termo: lazy(() => import('@/pages/auth/TermoPage')),
  Privacidade: lazy(() => import('@/pages/auth/PrivacidadePage')),
  Home: lazy(() => import('@/pages/home/HomePage')),
  Dashboard: lazy(() => import('@/pages/dashboard/DashboardPage')),
  Cirurgias: lazy(() => import('@/pages/cirurgias/CirurgiasPage')),
  Andamento: lazy(() => import('@/pages/cirurgias/AndamentoPage')),
  CirurgiaForm: lazy(() => import('@/pages/cirurgias/CirurgiaFormPage')),
  Clinicas: lazy(() => import('@/pages/clinicas/ClinicasPage')),
  Pacientes: lazy(() => import('@/pages/pacientes/PacientesPage')),
  Faltas: lazy(() => import('@/pages/faltas/FaltasPage')),
  Faturamento: lazy(() => import('@/pages/faturamento/FaturamentoPage')),
  Indicadores: lazy(() => import('@/pages/indicadores/IndicadoresPage')),
  Relatorios: lazy(() => import('@/pages/relatorios/RelatoriosPage')),
  Auditoria: lazy(() => import('@/pages/auditoria/AuditoriaPage')),
  Lgpd: lazy(() => import('@/pages/lgpd/LgpdPage')),
  Usuarios: lazy(() => import('@/pages/usuarios/UsuariosPage')),
  Config: lazy(() => import('@/pages/configuracoes/ConfiguracoesPage')),
  PainelTV: lazy(() => import('@/pages/painel-tv/PainelTVPage')),
  PainelEspera: lazy(() => import('@/pages/painel-espera/PainelEsperaPage'))
};

function Root() { return <Suspense fallback={<Spinner />}><Outlet /></Suspense>; }

function Home() {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={profile ? homeFor(profile.role) : '/login'} replace />;
}

export const routes = [
  {
    element: <Root />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <L.Login /> },
      { path: '/recuperar-senha', element: <L.Recuperar /> },
      { path: '/privacidade', element: <L.Privacidade /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/trocar-senha', element: <L.TrocarSenha /> },
          { path: '/termo', element: <L.Termo /> }
        ]
      },
      {
        element: <ProtectedRoute feature="painel_tv" />,
        children: [{ element: <KioskLayout />, children: [{ path: '/painel-tv', element: <L.PainelTV /> }] }]
      },
      {
        element: <ProtectedRoute feature="painel_espera" />,
        children: [{ element: <KioskLayout />, children: [{ path: '/painel-espera', element: <L.PainelEspera /> }] }]
      },
      {
        element: <ProtectedRoute />,
        children: [{
          element: <AppLayout />,
          children: [
            { path: '/home', element: <L.Home /> },
            { element: <ProtectedRoute feature="dashboard" />, children: [{ path: '/dashboard', element: <L.Dashboard /> }] },
            { element: <ProtectedRoute feature="cirurgias.ver" />, children: [{ path: '/cirurgias', element: <L.Cirurgias /> }] },
            { element: <ProtectedRoute feature="cirurgias.status" />, children: [{ path: '/cirurgias/andamento', element: <L.Andamento /> }] },
            { element: <ProtectedRoute feature="cirurgias.registrar" />, children: [
              { path: '/cirurgias/nova', element: <L.CirurgiaForm /> },
              { path: '/cirurgias/:id/editar', element: <L.CirurgiaForm /> }
            ] },
            { element: <ProtectedRoute feature="clinicas" />, children: [{ path: '/clinicas', element: <L.Clinicas /> }] },
            { element: <ProtectedRoute feature="pacientes.ver" />, children: [{ path: '/pacientes', element: <L.Pacientes /> }] },
            { element: <ProtectedRoute feature="faltas.ver" />, children: [{ path: '/faltas', element: <L.Faltas /> }] },
            { element: <ProtectedRoute feature="relatorios" />, children: [
              { path: '/indicadores', element: <L.Indicadores /> },
              { path: '/faturamento', element: <L.Faturamento /> },
              { path: '/relatorios', element: <L.Relatorios /> }
            ] },
            { element: <ProtectedRoute feature="auditoria" />, children: [{ path: '/auditoria', element: <L.Auditoria /> }] },
            { element: <ProtectedRoute feature="lgpd" />, children: [{ path: '/lgpd', element: <L.Lgpd /> }] },
            { element: <ProtectedRoute feature="usuarios" />, children: [{ path: '/usuarios', element: <L.Usuarios /> }] },
            { element: <ProtectedRoute feature="configuracoes" />, children: [{ path: '/configuracoes', element: <L.Config /> }] }
          ]
        }]
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
];

export const router = createBrowserRouter(routes);
export function AppRouter() { return <RouterProvider router={router} />; }
