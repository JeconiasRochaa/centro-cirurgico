# Relatório de Impacto à Proteção de Dados (RIPD) — modelo preenchido tecnicamente

> **Rascunho técnico.** Deve ser revisado e aprovado pelo encarregado (DPO) e pelo jurídico. Não constitui parecer jurídico.

**Controlador:** Hospital Regional de Palmeira dos Índios (confirmar razão social/CNPJ). **Encarregado:** `VITE_DPO_NOME` / `VITE_DPO_EMAIL`.
**Finalidade:** agendamento, execução e acompanhamento de procedimentos cirúrgicos; faturamento; segurança do paciente.
**Base legal (a confirmar):** tutela da saúde (art. 7º, VIII e art. 11, II, "f"), cumprimento de obrigação legal/regulatória e exercício regular de direitos.
**Dados tratados:** identificação (nome, prontuário, nascimento, CPF, contato, endereço), dados de saúde (procedimento, alergias, tipo sanguíneo, observações, contato de emergência), dados de usuários (nome, login, perfil), logs.
**Titulares:** pacientes (inclusive crianças/idosos), profissionais.

| Risco | Medida implementada | Risco residual |
|---|---|---|
| Acesso indevido por perfil inadequado | Regras do banco por perfil; funções revalidam; contas inativas bloqueadas | Médio — depende de homologação das regras no emulador |
| Vazamento por painéis | Painéis sem acesso público; contas de exibição; dados minimizados; nome abreviado | Médio — exposição visual na TV é inerente |
| Senhas expostas | Firebase Auth; sem senhas no banco; remoção de `settings/users` legado | Baixo |
| Elevação de privilégio | Perfis só por Cloud Functions | Baixo |
| Falta de rastreabilidade | `audit_logs` e `access_logs` | Baixo |
| Exclusão indevida | Sem exclusão física; exclusão lógica com motivo | Baixo |
| Transferência internacional | A confirmar localização do banco | **Aberto** — decisão do DPO |
| Retenção excessiva | Política (20 anos prontuário) e anonimização após prazo | Médio — rotina de revisão a definir |
| Incidentes | Plano de resposta (`PLANO_INCIDENTES.md`) | Médio |
