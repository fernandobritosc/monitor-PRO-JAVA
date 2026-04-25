---
name: agent-orchestration-multi-agent-optimize
description: "Optimize multi-agent systems with coordinated profiling, workload distribution, and cost-aware orchestration. Use when improving agent performance, throughput, or reliability."
---

# Multi-Agent Optimization Toolkit (MonitorPRO)

Esta skill foca em transformar a orquestração em algo eficiente, rápido e econômico, monitorando gargalos em tempo real.

## 🚀 Use esta skill para:
- Melhorar a coordenação, throughput e latência entre agentes.
- Identificar gargalos em workflows complexos.
- Otimizar o uso de tokens e a janela de contexto.
- Controlar custos de API (GPT-4 vs Claude vs Gemini).

## 📊 Estratégia de Profiling
Monitoramos diferentes camadas do sistema:
1. **DB Performance Agent**: Análise de execução de queries e uso de índices (Supabase).
2. **App Performance Agent**: Profiling de CPU/Memória e complexidade algorítmica.
3. **Frontend Performance Agent**: Métricas de renderização e Core Web Vitals (Framer Motion/React).

## ✂️ Otimização de Contexto
- **Compressão Inteligente**: Truncamento baseado em relevância semântica.
- **Budget de Tokens**: Gestão dinâmica para evitar estouro da janela de contexto.

## 🤝 Eficiência de Coordenação
- **Execução Paralela**: Design de tarefas que rodam simultaneamente.
- **Minimização de Overhead**: Redução da comunicação desnecessária entre agentes.
- **Workload Distribution**: Distribuição dinâmica de carga baseada na capacidade de cada agente.

## 💰 Gestão de Custos
- Seleção adaptativa de modelos (ex: Haiku para tarefas simples, Sonnet para lógica complexa).
- Caching preditivo para evitar chamadas de API duplicadas.

## ⚠️ Considerações Chave
- **Meça antes e depois**: Nunca otimize sem dados de baseline.
- **Estabilidade Primeiro**: Implemente mudanças graduais e reversíveis.
- **Balanceamento**: Ganhos de performance não devem comprometer a estabilidade do sistema.
