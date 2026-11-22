import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { acceptTerms } from '@/services/auth/authService';
import { Button } from '@/components/common';
import { friendlyError } from '@/utils/errors';
import { homeFor } from '@/utils/permissions';
import { TERMO_VERSAO } from '@/utils/constants';
import { AuthShell } from './AuthShell';

/** Termo de uso e confidencialidade para profissionais (aceite registrado com data/hora e versão). */
export default function TermoPage() {
  const { profile, refreshProfile, logout } = useAuth();
  const nav = useNavigate();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    if (!profile) return;
    setBusy(true); setError(null);
    try { await acceptTerms(profile.uid); await refreshProfile(); nav(homeFor(profile.role), { replace: true }); }
    catch (e) { setError(friendlyError(e)); setBusy(false); }
  };

  return (
    <AuthShell title="Termo de uso e confidencialidade" subtitle={`Versão ${TERMO_VERSAO}`}>
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>Este sistema trata <strong>dados pessoais sensíveis de saúde</strong> de pacientes (Lei nº 13.709/2018 – LGPD, art. 11). Ao continuar, você declara que:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>acessará apenas as informações necessárias para as suas atribuições profissionais;</li>
          <li>manterá sigilo sobre os dados e não os compartilhará por meios não autorizados (fotos, mensagens, impressões);</li>
          <li>não compartilhará sua senha e encerrará a sessão ao se ausentar;</li>
          <li>está ciente de que seus acessos e alterações são registrados para fins de segurança e auditoria;</li>
          <li>comunicará imediatamente ao encarregado (DPO) qualquer incidente ou suspeita de acesso indevido.</li>
        </ul>
        <p>Leia o <Link to="/privacidade" target="_blank" className="text-brand underline">Aviso de Privacidade</Link> completo.</p>
      </div>
      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
      <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={ok} onChange={(e) => setOk(e.target.checked)} /> Li e concordo com o termo de uso e confidencialidade.</label>
      <div className="mt-3 flex gap-2"><Button className="btn-primary flex-1" disabled={!ok} loading={busy} onClick={accept}>Continuar</Button><button className="btn-secondary" onClick={() => logout()}>Sair</button></div>
    </AuthShell>
  );
}
