---
name: agent-orchestrator
description: Meta-skill que orquestra todos os agentes do ecossistema. Scan automático de skills, match por capacidades, coordenação de workflows multi-skill e registry management.
---

# Agent Orchestrator (MonitorPRO)

Esta é a camada central de decisão que coordena todas as outras habilidades do projeto.

## 🚀 Como Funciona
O orquestrador atua como um roteador inteligente. Para cada solicitação, ele:
1. **Faz Varredura**: Identifica quais skills estão disponíveis em `.agent/skills/`.
2. **Realiza o Match**: Pontua as skills baseando-se na descrição e no contexto da tarefa.
3. **Orquestra**: Se mais de uma skill for relevante, define a ordem de execução (Pipeline, Paralelo ou Primário+Suporte).

## 🔄 Workflow de Orquestração
- **Passo 1: Auto-Discovery**: Varredura automática de novos arquivos `SKILL.md`.
- **Passo 2: Skill Matching**: Seleção das ferramentas ideais para a tarefa atual.
- **Passo 3: Execution Plan**: Criação de um plano de execução sequencial ou paralelo.

## 🏗️ Padrões de Orquestração
- **Pipeline Sequencial**: O output de uma skill alimenta a próxima (ex: Scraper -> Notificador).
- **Execução Paralela**: Múltiplas skills trabalham simultaneamente (ex: Deploy + Testes).
- **Primário + Suporte**: Uma skill lidera o processo e outras fornecem dados auxiliares.

## 📝 Registry de Habilidades
O registry (armazenado em `data/registry.json`) mantém o metadado de todas as capacidades do ecossistema, permitindo consultas ultra-rápidas e automáticas.

## ⚠️ Sharp Edges
- **Intervenção Manual**: Evite registrar skills manualmente; use o scanner automático.
- **Match Impreciso**: Se uma skill não for ativada, revise os triggers e as keywords na descrição do seu `SKILL.md`.
- **Complexidade Excessiva**: Tente não encadear mais de 3 skills em um único pipeline para manter a estabilidade.
