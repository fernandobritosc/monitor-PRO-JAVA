---
name: pr-writer
description: "Create pull requests following Sentry's engineering practices. Requires GitHub CLI (gh)."
---

# PR Writer (MonitorPRO)

Esta skill automatiza a criação de Pull Requests estruturados, garantindo que o histórico do projeto seja legível e profissional.

## 🛠️ Pré-requisitos
- GitHub CLI (`gh`) autenticado.
- Todas as mudanças devem estar commitadas (use `git status` para verificar).

## 📋 Processo de Criação
1. **Verificar Branch**: Garantir que você está na branch correta e atualizada com a base (ex: `main`).
2. **Analisar Diff**: Revisar `git diff` para entender o impacto total das mudanças.
3. **Escrever Descrição**: Seguir a estrutura:
    - O que o PR faz (Breve).
    - Motivação (Por que?).
    - Abordagens alternativas (Se houver).
    - Contexto adicional para revisores.

## 🏷️ Formato de Título (Conventional Commits)
- `feat(scope): ...` para novas funcionalidades.
- `fix(scope): ...` para correção de bugs.
- `ref(scope): ...` para refatorações.

## 🔗 Referenciando Issues
Use a sintaxe correta para vincular ou fechar tarefas:
- `Fixes #123` (Fecha issue no merge).
- `Refs GH-123` (Apenas vincula).

## 💡 Melhores Práticas
- **Um PR por funcionalidade**: Evite misturar mudanças não relacionadas.
- **Mantenha Revisável**: PRs menores são revisados mais rápido e com mais qualidade.
- **Explique o "Porquê"**: O código mostra *o que* mudou; a descrição explica *por que* mudou.
- **Draft PRs**: Use para obter feedback antecipado em trabalhos em progresso.

## ⚠️ Sharp Edges
- **Bugs no `gh pr edit`**: Se precisar atualizar um PR, prefira usar `gh api` devido a instabilidades conhecidas no comando de edição.
- **Checklists Redundantes**: Evite listas de verificação genéricas na descrição; foque no contexto real.
