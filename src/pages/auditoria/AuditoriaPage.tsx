import { useMemo, useState } from 'react';
import { Badge, EmptyState, ErrorState, Field, PageHeader, Spinner } from '@/components/common';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeAudit } from '@/services/database/others';
import { subscribeAccessLogs, ACCESS_LOGS_LIMIT, type AccessLog } from '@/services/database/audit';
import { subscribeUsers } from '@/services/database/users';
import { useAuth } from '@/contexts/AuthContext';
import type { AuditLog, UserProfile } from '@/types';

const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString('pt-BR') : '-');

export default function AuditoriaPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<'ops' | 'acessos'>('ops');
  const [entity, setEntity] = useState('');
  const ops = useSubscription<AuditLog[]>((cb, e) => subscribeAudit(cb, e), []);
  const acc = useSubscription<AccessLog[]>((cb, e) => subscribeAccessLogs(cb, e), []);
  // Somente administrador lê a lista de usuários; para os demais mostramos o identificador.
  const users = useSubscription<UserProfile[]>((cb, e) => (can('usuarios') ? subscribeUsers(cb, e) : (cb([]), () => undefined)), []);
  const names = useMemo(() => new Map(users.data.map((u) => [u.uid, u.name])), [users.data]);
  const who = (uid: string, username?: string) => names.get(uid) ?? username ?? uid.slice(0, 8);
  const opsList = useMemo(() => ops.data.filter((l) => !entity || l.entity === entity), [ops.data, entity]);
  const cur = tab === 'ops' ? ops : acc;

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Registro de operações e consultas a prontuários. Não contém senhas, tokens nem valores de dados pessoais." />
      <div className="mb-3 flex gap-2" role="tablist">
        {([['ops', 'Operações'], ['acessos', 'Acessos a prontuários']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab(k)}>{l}</button>))}
      </div>
      {tab === 'ops' && <div className="card mb-3 max-w-xs"><Field label="Entidade"><select className="input" value={entity} onChange={(e) => setEntity(e.target.value)}><option value="">Todas</option>{[...new Set(ops.data.map((l) => l.entity))].map((e) => <option key={e}>{e}</option>)}</select></Field></div>}
      {cur.loading ? <Spinner /> : cur.error ? <ErrorState message={cur.error} /> : tab === 'ops' ? (
        opsList.length === 0 ? <EmptyState /> : (
          <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data/hora</th><th className="p-3">Usuário</th><th className="p-3">Operação</th><th className="p-3">Registro</th><th className="p-3">Campos</th><th className="p-3">Resultado</th></tr></thead>
            <tbody>{opsList.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 align-top"><td className="p-3 whitespace-nowrap">{fmt(l.ts)}</td><td className="p-3">{who(l.uid, l.username)}</td><td className="p-3">{l.action}</td><td className="p-3">{l.entity}{l.entityId ? ` / ${l.entityId}` : ''}</td><td className="p-3 text-xs text-slate-500">{l.fields?.join(', ')}</td><td className="p-3"><Badge tone={l.result === 'ok' ? 'ok' : 'cancelada'}>{l.result}</Badge></td></tr>))}</tbody>
          </table></div>)
      ) : acc.data.length === 0 ? <EmptyState /> : (
        <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data/hora</th><th className="p-3">Usuário</th><th className="p-3">Entidade</th><th className="p-3">Registro</th></tr></thead>
          <tbody>{acc.data.map((l) => <tr key={l.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap">{fmt(l.ts)}</td><td className="p-3">{who(l.uid)}</td><td className="p-3">{l.entity}</td><td className="p-3">{l.entityId}</td></tr>)}</tbody>
        </table><p className="p-3 text-xs text-slate-500">Exibindo os últimos {ACCESS_LOGS_LIMIT} acessos.</p></div>
      )}
    </div>
  );
}
