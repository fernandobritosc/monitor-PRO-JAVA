---
name: agent-loop
description: Gerencia ciclos de execução recursiva, verificação de erros e refinamento contínuo de tarefas complexas.
---

# Agent Loop Skill

Esta skill define o protocolo de "pensamento-ação-verificação" para garantir que nenhuma tarefa seja entregue com erros básicos ou incompleta.

## 🔄 Ciclo de Execução

1. **Análise Inicial**: Decompor o problema em sub-tarefas atômicas e consultar o `PRD.md`.
2. **Execução**: Implementar a solução seguindo os padrões de `clean-code`.
3. **Verificação (Self-Correction)**: 
   - Rodar `npm run lint` para garantir padrões de código.
   - Rodar testes unitários relevantes.
   - Verificar se a implementação não quebra a UX ( neurodiversidade/TDAH).
4. **Refinamento**: Se houver erros ou pontos de melhoria, reiniciar o ciclo.
5. **Handoff**: Documentar no `walkthrough.md` e atualizar a `MEMORY.md`.

## 🛠 Validação Obrigatória
Sempre que uma alteração lógica for feita, o loop deve validar com:
- `npm run lint` (Zero warnings/errors)
- `npm run test` (Sucesso em todos os casos)


