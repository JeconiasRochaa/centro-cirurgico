import { useState, type ChangeEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, PageHeader } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { useIdentity } from '@/hooks/useIdentity';
import { useSubscription } from '@/hooks/useSubscription';
import { removeDoctor, saveDoctor, saveLgpdSetting, saveSetting, subscribeDoctors, subscribeLgpdSettings, type DoctorWithKey, type LgpdSettings } from '@/services/database/others';
import { apiRebuildPaineis } from '@/services/api/functions';
import { doctorSchema, identitySchema, type DoctorForm } from '@/schemas';
import { friendlyError } from '@/utils/errors';
import { z } from 'zod';

const MAX_LOGO = 500 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
type IdForm = z.infer<typeof identitySchema>;

function LogoField({ label, value, k }: { label: string; value?: string; k: 'logo' | 'govLogo' }) {
  const toast = useToast();
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) { toast.error('Use PNG, JPEG ou WebP (SVG não é aceito por segurança).'); return; }
    if (f.size > MAX_LOGO) { toast.error('Imagem maior que 500 KB.'); return; }
    const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
    try { await saveSetting(k, url); toast.success('Imagem atualizada.'); } catch (err) { toast.error(friendlyError(err)); }
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">{value && <img src={value} alt="" className="h-12 w-12 rounded border object-contain" />}
        <input type="file" accept={TYPES.join(',')} onChange={onFile} />
        {value && <button type="button" className="btn-secondary btn-sm" onClick={() => void saveSetting(k, '')}>Remover</button>}</div>
    </Field>
  );
}

export default function ConfiguracoesPage() {
  const toast = useToast();
  const identity = useIdentity();
  const doctors = useSubscription<DoctorWithKey[]>((cb, e) => subscribeDoctors(cb, e), []).data;
  const lgpd = useSubscription<LgpdSettings>((cb, e) => subscribeLgpdSettings(cb, e), { retencaoAnos: 20, tvNomeCompleto: false }).data;
  const idf = useForm<IdForm>({ resolver: zodResolver(identitySchema), values: { systemName: identity.systemName, hospitalName: identity.hospitalName } });
  const dr = useForm<DoctorForm>({ resolver: zodResolver(doctorSchema) });
  const [busy, setBusy] = useState(false);

  const saveId = idf.handleSubmit(async (v) => { try { await saveSetting('systemName', v.systemName); await saveSetting('hospitalName', v.hospitalName); toast.success('Identidade salva.'); } catch (e) { toast.error(friendlyError(e)); } });
  const addDoctor = dr.handleSubmit(async (v) => { try { await saveDoctor(null, v); dr.reset({ name: '', crm: '' }); toast.success('Médico adicionado.'); } catch (e) { toast.error(friendlyError(e)); } });
  async function setLgpd<K extends keyof LgpdSettings>(k: K, v: LgpdSettings[K]) {
    setBusy(true);
    try { await saveLgpdSetting(k, v); if (k === 'tvNomeCompleto') await apiRebuildPaineis({}); toast.success('Configuração salva.'); } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" />
      <form onSubmit={saveId} className="card grid gap-3 sm:grid-cols-2" noValidate>
        <h2 className="font-bold text-brand sm:col-span-2">Identidade</h2>
        <Field label="Nome do sistema" error={idf.formState.errors.systemName?.message}><input className="input" {...idf.register('systemName')} /></Field>
        <Field label="Nome do hospital" error={idf.formState.errors.hospitalName?.message}><input className="input" {...idf.register('hospitalName')} /></Field>
        <LogoField label="Logo do hospital (PNG/JPEG/WebP, até 500 KB)" value={identity.logo} k="logo" />
        <LogoField label="Logo do governo" value={identity.govLogo} k="govLogo" />
        <div className="sm:col-span-2"><Button className="btn-primary" loading={idf.formState.isSubmitting}>Salvar identidade</Button></div>
      </form>
      <section className="card space-y-3">
        <h2 className="font-bold text-brand">Painéis e privacidade (LGPD)</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={identity.salaEsperaAtiva} onChange={(e) => void saveSetting('salaEsperaAtiva', e.target.checked)} /> Painel da sala de espera ativo</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={lgpd.tvNomeCompleto} onChange={(e) => void setLgpd('tvNomeCompleto', e.target.checked)} /> Exibir nome completo do paciente na TV do centro cirúrgico (padrão: nome abreviado)</label>
        <Field label="Prazo de retenção de prontuários (anos)" className="max-w-xs"><input type="number" min={20} className="input" value={lgpd.retencaoAnos} onChange={(e) => { const n = Number(e.target.value); if (n >= 20) void setLgpd('retencaoAnos', n); }} /></Field>
        <p className="text-xs text-slate-500">Mínimo de 20 anos (Lei 13.787/2018). A anonimização só é permitida após esse prazo.</p>
      </section>
      <section className="card">
        <h2 className="mb-3 font-bold text-brand">Médicos</h2>
        <form onSubmit={addDoctor} className="mb-3 flex flex-wrap items-end gap-2" noValidate>
          <Field label="Nome" error={dr.formState.errors.name?.message}><input className="input" {...dr.register('name')} /></Field>
          <Field label="CRM" error={dr.formState.errors.crm?.message}><input className="input" {...dr.register('crm')} /></Field>
          <Button className="btn-primary">Adicionar</Button>
        </form>
        <ul className="divide-y text-sm">{doctors.map((d) => <li key={d._key} className="flex items-center justify-between py-1.5"><span>{d.name} — CRM {d.crm}</span><button className="btn-danger btn-sm" aria-label={`Remover ${d.name}`} onClick={() => void removeDoctor(d._key)}><Trash2 size={14} /></button></li>)}</ul>
      </section>
    </div>
  );
}
