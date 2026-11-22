import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RETENCAO_PRONTUARIO_ANOS, TERMO_VERSAO } from '@/utils/constants';

const DPO_NOME = (import.meta.env.VITE_DPO_NOME as string) || '[Nome do encarregado — configurar VITE_DPO_NOME]';
const DPO_EMAIL = (import.meta.env.VITE_DPO_EMAIL as string) || '[e-mail do encarregado — configurar VITE_DPO_EMAIL]';

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return <section className="mb-5"><h2 className="mb-1 text-base font-bold text-brand">{t}</h2><div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div></section>;
}

/** Aviso de Privacidade (LGPD, art. 9º). Revise com o jurídico/DPO do hospital antes de publicar. */
export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-brand underline"><ArrowLeft size={14} /> Voltar</Link>
      <h1 className="mb-1 text-2xl font-bold text-brand">Aviso de Privacidade — Centro Cirúrgico HRPI</h1>
      <p className="mb-5 text-xs text-slate-500">Versão {TERMO_VERSAO}</p>

      <S t="1. Quem é o controlador">
        <p>O <strong>Hospital Regional de Palmeira dos Índios (HRPI)</strong> é o controlador dos dados pessoais tratados neste sistema de gestão do Centro Cirúrgico.</p>
        <p>Encarregado pelo tratamento de dados (DPO): <strong>{DPO_NOME}</strong> — {DPO_EMAIL}.</p>
      </S>
      <S t="2. Quais dados tratamos">
        <p><strong>Pacientes:</strong> nome, data de nascimento/idade, número de prontuário, procedimento cirúrgico, equipe, sala e horário, necessidade de sangue/UTI, observações clínicas e, na ficha do prontuário, sexo, CPF, contato, endereço, tipo sanguíneo, alergias, comorbidades e contato de emergência.</p>
        <p><strong>Profissionais usuários:</strong> nome, login/e-mail, perfil de acesso, aceite do termo, e registros de acesso e de alterações (data/hora e identificação).</p>
      </S>
      <S t="3. Finalidades e bases legais">
        <p>Os dados de saúde são tratados para a <strong>tutela da saúde</strong>, em procedimento realizado por profissionais de saúde e serviços de saúde (LGPD, art. 11, II, "f"), e para o <strong>cumprimento de obrigação legal e regulatória</strong> (art. 11, II, "a"), como a guarda de prontuário. Finalidades: agendamento e execução cirúrgica, segurança do paciente, faturamento, auditoria e estatísticas de gestão. Os dados de profissionais são tratados para controle de acesso, segurança e auditoria (art. 7º, II e IX).</p>
      </S>
      <S t="4. Quem acessa">
        <p>O acesso é restrito por perfil (princípio da necessidade): equipe do centro cirúrgico, enfermagem, direção, faturamento (sem prontuário) e clínicas solicitantes (somente as próprias solicitações). Os painéis de TV e de sala de espera exibem apenas o mínimo necessário e a sala de espera mostra somente o <strong>nome abreviado</strong> do paciente.</p>
      </S>
      <S t="5. Compartilhamento e armazenamento">
        <p>Os dados são armazenados em infraestrutura de nuvem (Google Firebase), que atua como operadora. Os servidores do banco podem estar localizados fora do Brasil; a transferência internacional é feita com as garantias contratuais do operador (LGPD, art. 33). Não vendemos nem compartilhamos dados com terceiros para fins comerciais.</p>
      </S>
      <S t="6. Por quanto tempo guardamos">
        <p>Dados de prontuário são mantidos por no mínimo <strong>{RETENCAO_PRONTUARIO_ANOS} anos</strong> (Lei nº 13.787/2018), podendo ser eliminados ou anonimizados após esse prazo. Registros hospitalares não são apagados definitivamente: a "exclusão" no sistema é lógica, com motivo e responsável registrados. Registros de auditoria são conservados para fins de segurança.</p>
      </S>
      <S t="7. Seus direitos (LGPD, art. 18)">
        <p>O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização/eliminação (quando aplicável), portabilidade, informação sobre compartilhamento e revisão de decisões. Algumas solicitações podem ser limitadas pela obrigação legal de guarda do prontuário. Envie o pedido ao encarregado (item 1); responderemos nos prazos legais.</p>
      </S>
      <S t="8. Segurança">
        <p>Adotamos autenticação individual, controle de acesso por perfil verificado no servidor, registro de acessos e alterações, encerramento automático de sessão por inatividade, minimização de dados em painéis e criptografia em trânsito. Incidentes de segurança serão comunicados à ANPD e aos titulares quando houver risco ou dano relevante (art. 48).</p>
      </S>
    </div>
  );
}
