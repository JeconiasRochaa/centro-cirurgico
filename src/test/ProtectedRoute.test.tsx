import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UserProfile } from '@/types';
import { can } from '@/utils/permissions';
import { TERMO_VERSAO } from '@/utils/constants';

let mock: { profile: UserProfile | null; loading: boolean };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ ...mock, can: (f: never) => can(mock.profile?.role, f) }) }));
import { ProtectedRoute } from '@/routes/ProtectedRoute';

const user = (o: Partial<UserProfile>): UserProfile => ({ uid: 'u', name: 'N', username: 'n', role: 'admin', active: true, termoVersao: TERMO_VERSAO, ...o });
function renderAt(path: string, feature?: Parameters<typeof ProtectedRoute>[0]['feature']) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/termo" element={<div>TERMO</div>} />
        <Route path="/trocar-senha" element={<div>TROCAR</div>} />
        <Route path="/home" element={<div>HOME-CLINICA</div>} />
        <Route element={<ProtectedRoute feature={feature} />}><Route path="/secreto" element={<div>CONTEUDO</div>} /></Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redireciona visitante para o login', () => { mock = { profile: null, loading: false }; renderAt('/secreto'); expect(screen.getByText('LOGIN')).toBeInTheDocument(); });
  it('exige troca de senha pendente', () => { mock = { profile: user({ mustChangePassword: true }), loading: false }; renderAt('/secreto'); expect(screen.getByText('TROCAR')).toBeInTheDocument(); });
  it('exige aceite do termo atual', () => { mock = { profile: user({ termoVersao: 'antigo' }), loading: false }; renderAt('/secreto'); expect(screen.getByText('TERMO')).toBeInTheDocument(); });
  it('bloqueia perfil sem permissão', () => { mock = { profile: user({ role: 'clinica', clinicaId: 'pediatria' }), loading: false }; renderAt('/secreto', 'usuarios'); expect(screen.getByText('HOME-CLINICA')).toBeInTheDocument(); expect(screen.queryByText('CONTEUDO')).toBeNull(); });
  it('libera perfil com permissão', () => { mock = { profile: user({}), loading: false }; renderAt('/secreto', 'usuarios'); expect(screen.getByText('CONTEUDO')).toBeInTheDocument(); });
});
