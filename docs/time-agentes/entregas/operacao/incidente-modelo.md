# Registro de incidente — modelo preenchível

Não inserir dados reais de clientes em arquivos versionados. Copiar para controle de acesso autorizado e mascarar evidências. Este arquivo não representa incidente aberto.

| Campo | Preencher |
| --- | --- |
| ID interno | [ID] |
| Estado | [Novo / Em triagem / Em reprodução / Em correção / Em validação / Encerrado] |
| Responsável | [Equipe ou responsável] |
| Categoria | [Login/recuperação / App fecha / Cálculo / Outra] |
| Prioridade e impacto | [Quem é afetado, tarefa bloqueada e eventual alternativa] |
| Data, hora e fuso do evento | [AAAA-MM-DD HH:mm; fuso informado] |
| Plataforma | [iOS / Android / Web] |
| Dispositivo e sistema | [Modelo; versão] |
| Versão do app e build | [Versão/build; não presumir pela data de instalação] |
| Identificador mascarado | [ID interno minimizado; não incluir email/telefone completos] |
| Esperado | [Comportamento esperado] |
| Observado | [Comportamento e mensagem exata, sem segredos] |
| Evidência | [Local de acesso restrito; não anexar tokens/senhas/códigos] |
| Hipótese | [Hipótese técnica, separada de fato] |
| Confiança e fundamento | [Baixa/média/alta e evidência] |
| Reprodução local | [Não tentada / Não reproduzida / Reproduzida] |
| Próximo teste | [Teste seguro e ambiente] |
| Bloqueio | [Dado ou acesso necessário, sem credenciais] |

## Passos mínimos

1. [Estado inicial e forma de entrada, se relevante.]
2. [Ação realizada.]
3. [Resultado observado e recorrência.]

## Testes executados

| Data | Ambiente/build | Procedimento ou comando | Esperado | Obtido | Resultado e limitação |
| --- | --- | --- | --- | --- | --- |
| [Data] | [Local/dispositivo] | [Procedimento] | [Esperado] | [Obtido] | [Passou/falhou/bloqueado; limite] |

## Resposta ao cliente

[Confirmar o entendimento e informar o próximo passo. Não prometer prazo sem compromisso validado. Não afirmar correção apenas porque o problema não apareceu em outro aparelho.]

## Encerramento

- [ ] Critério específico de resolução definido: [critério].
- [ ] Evidência de validação no ambiente apropriado registrada.
- [ ] Risco de perda de dados avaliado antes de limpeza/reinstalação.
- [ ] Cliente informado mediante envio autorizado, ou envio identificado como pendente.
- [ ] Reabertura vinculada ao mesmo caso quando aplicável.

Referência: `docs/time-agentes/entregas/DP-007-suporte.md` e `docs/time-agentes/entregas/operacao/triagem.csv`.
