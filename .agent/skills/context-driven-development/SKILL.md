---
name: context-driven-development
description: "Guia para implementar e manter o contexto como um artefato gerenciado junto ao código, permitindo interações de IA consistentes."
---

# Context-Driven Development (MonitorPRO)

O Context-Driven Development trata o contexto do projeto como um artefato de primeira classe. Em vez de depender de prompts ad-hoc, estabelecemos uma base persistente e estruturada.

## 🧠 Filosofia Central
1. **Contexto precede o código**: Defina o QUE e o COMO antes de implementar.
2. **Documentação Viva**: Os artefatos de contexto evoluem com o projeto.
3. **Fonte Única de Verdade**: Um local canônico para cada tipo de informação.
4. **Alinhamento de IA**: Contexto consistente produz comportamento de IA consistente.

## 📂 Artefatos de Contexto (Estrutura MonitorPRO)
- **product.md (PRD.md)**: Define o QUE e o PORQUÊ (Visão, Metas, Usuários).
- **tech-stack.md (ARCHITECTURE.md)**: Define COM O QUÊ (Linguagens, Deps, Infra).
- **workflow.md (AGENTS.md)**: Define COMO TRABALHAR (Git, TDD, Review).
- **tracks.md (task.md)**: Acompanha o QUE ESTÁ ACONTECENDO (Registry de tarefas).

## 🔄 O Workflow
**Contexto → Spec & Plan → Implementação**

1. **Fase de Contexto**: Verificar se os artefatos estão atualizados.
2. **Fase de Especificação**: Definir requisitos e critérios de aceitação (DoD).
3. **Fase de Planejamento**: Decompor em tarefas acionáveis.
4. **Fase de Implementação**: Executar seguindo os padrões de código.

## ✅ Melhores Práticas
- **Leia o contexto primeiro**: Sempre leia os artefatos antes de iniciar qualquer trabalho.
- **Atualizações Incrementais**: Faça pequenas mudanças no contexto conforme o projeto cresce.
- **Sincronização**: Garanta que mudanças no PRD reflitam na Arquitetura se necessário.
- **Validação**: Verifique o checklist de contexto antes de cada "Track" (tarefa).

## ⚠️ Anti-Padrões a Evitar
- **Contexto Obsoleto**: Deixar documentos ficarem desatualizados.
- **Contexto Implícito**: Confiar em conhecimento que não está capturado nos artefatos.
- **Excesso de Especificação**: Tornar o contexto tão detalhado que se torna impossível de manter.
