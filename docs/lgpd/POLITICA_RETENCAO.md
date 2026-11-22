# Política de retenção (proposta)
- **Prontuários e registros assistenciais:** mínimo de **20 anos** a partir do último registro (Lei 13.787/2018, art. 6º) — configurável em *Configurações* (nunca abaixo de 20).
- O sistema **não apaga fisicamente** cirurgias/pacientes. A exclusão é lógica, com motivo e autoria, e o registro continua preservado.
- **Anonimização/eliminação:** somente após o prazo; a função `anonymizeTitular` recusa registros dentro do prazo e registra a operação em auditoria.
- **Painéis:** espelhos removidos diariamente (função `manutencaoDiaria`); não são fonte de verdade.
- **Logs:** definir prazo com o DPO (sugestão: 5 anos). Nenhuma rotina automática de expurgo de logs foi implementada.
- Backups gerados pela migração contêm dados pessoais: guardar criptografados, com acesso restrito, e eliminar quando não forem mais necessários.
