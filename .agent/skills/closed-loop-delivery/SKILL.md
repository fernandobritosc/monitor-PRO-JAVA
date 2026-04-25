---
name: closed-loop-delivery
description: "Use when a coding task must be completed against explicit acceptance criteria with minimal user re-intervention across implementation, review feedback, deployment, and runtime verification."
---

# Closed-Loop Delivery (MonitorPRO)

Trate cada tarefa como incompleta até que os critérios de aceitação sejam verificados com evidências, não apenas quando o código for alterado.

## 🎯 Regra de Ouro: Entregar contra o DoD (Definition of Done)
O sucesso não é o tamanho do diff, mas sim o cumprimento dos critérios de aceitação.

## ✅ Quando Usar
- Quando você me dá uma tarefa de código/correção e espera a conclusão de ponta a ponta.
- Quando a tarefa envolve código + testes + deploy + verificações em runtime.
- Quando queremos evitar prompts manuais repetitivos como "agora teste" ou "agora verifique".

## 🛠️ Workflow Padrão (MonitorPRO)
1.  **Definir DoD**: Converter seu pedido em critérios testáveis (ex: "O endpoint de login retorna 200 e o token JWT é salvo no Dexie").
2.  **Implementação Mínima**: Focar apenas no objetivo da tarefa para manter o escopo enxuto.
3.  **Verificação Local**: Rodar `npm run test` e `npm run lint`.
4.  **Review Loop**: Processar comentários de PR e correções em lote para evitar ruído.
5.  **Runtime Verification**: Verificar o comportamento real (logs, API, banco de dados) contra o DoD.
6.  **Decisão de Conclusão**: Reportar como "concluído" apenas quando todos os checks do DoD passarem com evidência.

## 🛡️ Regras de Gate Humano
Solicitarei sua confirmação explícita para:
- Deploys em produção/staging fora do escopo acordado.
- Operações destrutivas (force push, deleção de dados, reset de banco).
- Ações que envolvam mudanças de custo (billing) ou segurança.
- Credenciais/secrets não disponíveis no repositório.

## 🛑 Condições de Parada (Escalação)
Vou parar e reportar um bloqueio se:
- O DoD falhar após 2 rodadas de iteração.
- Houver bloqueios de dependências externas (API fora do ar, falta de permissão).
- Houver instruções de revisão conflitantes.

## 📦 Contrato de Saída (Output)
Ao finalizar, sempre entregarei:
- Checklist de critérios de aceitação (Pass/Fail).
- Comandos e testes executados.
- Evidência de runtime (logs ou print de resultado de API).
