# Plano de resposta a incidentes de segurança (modelo)
1. **Detectar/registrar**: qualquer pessoa comunica ao encarregado (DPO) e à TI. Registrar data/hora, quem, o quê.
2. **Conter**: desativar usuários envolvidos (*Usuários → Ativo*), redefinir senhas, revogar sessões (Console Firebase), desligar painéis se necessário.
3. **Avaliar**: consultar `audit_logs` e `access_logs`; identificar titulares/dados afetados e risco/dano relevante.
4. **Comunicar**: havendo risco ou dano relevante, comunicar a ANPD e os titulares em prazo razoável (art. 48 — verificar o prazo vigente na regulamentação da ANPD).
5. **Corrigir e aprender**: corrigir a causa, revisar regras/perfis, atualizar RIPD e este plano.
Contatos: DPO (`VITE_DPO_EMAIL`), TI, direção. Preencher antes de entrar em produção.
