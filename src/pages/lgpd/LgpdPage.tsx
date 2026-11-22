import { useState } from 'react';
import { Download, ShieldAlert } from 'lucide-react';
import { Button, Field, PageHeader } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribePatients, type PatientWithKey } from '@/services/database/others';
import { apiAnonymizeTitular, apiExportTitular } from '@/services/api/functions';
import { friendlyError } from '@/utils/errors';
import { patientKey, safeFbKey } from '@/utils/format';

/** Atendimento de direitos do titular (LGPD art. 18): acesso/portabilidade (exportação) e anonimização (respeitando a retenção legal). */
export default function LgpdPage() {
  const toast = useToast();
  const patients = useSubscription<PatientWithKey[]>((cb, e) => subscribePatients(cb, e), []).data;
  const [prontuario, setProntuario] = useState('');
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [conf, setConf] = useState('');

  async function exportar() {
    if (!prontuario.trim() && !nome.trim()) { toast.error('Informe o prontuário ou o nome do titular.'); return; }
    setBusy(true);
    try {
      const data = await apiExportTitular({ prontuario: prontuario.trim() || undefined, nome: nome.trim() || undefined });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dados-titular-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
      toast.success('Exportação gerada (operação registrada em auditoria).');
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }
  async function anonimizar() {
    setBusy(true);
    try { const r = await apiAnonymizeTitular({ patientKey: key, confirmacao: conf }); toast.success(`${r.anonimizados} registro(s) anonimizado(s).`); setKey(''); setConf(''); }
    catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <PageHeader title="LGPD — Direitos do titular" subtitle="Toda operação nesta tela é registrada em auditoria (sem os dados pessoais envolvidos)." />
      <section className="card space-y-3">
        <h2 className="font-bold text-brand">Acesso / portabilidade (art. 18, II e V)</h2>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Prontuário"><input className="input" value={prontuario} onChange={(e) => setProntuario(e.target.value)} /></Field><Field label="Nome completo"><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></Field></div>
        <Button className="btn-primary" loading={busy} onClick={exportar}><Download size={16} /> Exportar dados (JSON)</Button>
      </section>
      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-bold text-red-700"><ShieldAlert size={18} /> Anonimização (art. 18, IV)</h2>
        <p className="text-sm text-slate-600">Registros de saúde devem ser mantidos pelo prazo legal de retenção (mínimo de 20 anos). O servidor recusa a anonimização de registros ainda dentro do prazo. A operação é irreversível.</p>
        <Field label="Paciente"><select className="input" value={key} onChange={(e) => setKey(e.target.value)}><option value="">Selecione</option>{patients.map((p) => <option key={p._key} value={safeFbKey(patientKey({ prontuario: p.prontuario, patient: p.nome }))}>{p.nome} — {p.prontuario}</option>)}</select></Field>
        <Field label='Digite "ANONIMIZAR" para confirmar'><input className="input" value={conf} onChange={(e) => setConf(e.target.value)} /></Field>
        <Button className="btn-danger" loading={busy} disabled={!key || conf !== 'ANONIMIZAR'} onClick={anonimizar}>Anonimizar</Button>
      </section>
    </div>
  );
}
