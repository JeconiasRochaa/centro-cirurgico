# Registro das Operações de Tratamento (ROPA) — rascunho

| Operação | Dados | Finalidade | Base legal (a confirmar) | Acesso | Retenção | Compartilhamento |
|---|---|---|---|---|---|---|
| Registro de cirurgia | nome, prontuário, nascimento, procedimento, equipe, observações | Assistência/agenda | Tutela da saúde | Admin, Diretor, Centro Cirúrgico, Enfermagem, Faturamento (leitura), Clínica (só as suas) | 20 anos | Firebase (operador) |
| Ficha do paciente | + CPF, contato, endereço, alergias, tipo sanguíneo | Segurança do paciente | Tutela da saúde | Admin, Diretor, Centro Cirúrgico (edita), Enfermagem (lê) | 20 anos | Firebase |
| Faltas | nome, procedimento, motivo | Gestão de agenda | Interesse legítimo/exercício de direitos | Equipe interna | 5 anos (sugerido — validar) | – |
| Painel TV | nome abreviado, procedimento, sala, equipe | Operação do centro cirúrgico | Tutela da saúde | Conta de exibição + equipe | Apagado diariamente | – |
| Painel sala de espera | nome abreviado, status | Informar acompanhantes | Tutela da saúde (minimizado) | Conta de exibição | Apagado diariamente | – |
| Usuários | nome, login, e-mail opcional, perfil | Controle de acesso | Execução de contrato/legítimo interesse | Admin | Enquanto vínculo + 5 anos (validar) | Firebase Auth |
| Auditoria | uid, operação, entidade, campos alterados, data/hora | Segurança e responsabilização | Obrigação legal/legítimo interesse | Admin, Diretor | 5 anos (validar) | – |
Operador: Google/Firebase (verificar contrato, localização e cláusulas).
