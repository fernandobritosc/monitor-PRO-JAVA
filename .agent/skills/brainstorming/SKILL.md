---
name: brainstorming
description: "Use before creative or constructive work. Transforms vague ideas into validated designs through disciplined reasoning and collaboration."
---

# Brainstorming Ideas Into Designs (MonitorPRO)

O objetivo desta skill é transformar ideias brutas em designs e especificações validadas através de um diálogo estruturado **antes de qualquer implementação**.

## 🛑 Regra Fundamental
Você **não tem permissão** para implementar ou codificar enquanto esta skill estiver ativa. O foco é o design e a clareza.

## 🔄 O Processo

1.  **Entender o Contexto**: Revisar arquivos, documentação e decisões passadas antes de perguntar qualquer coisa.
2.  **Uma Pergunta por Vez**: Perguntas focadas e, preferencialmente, de múltipla escolha para garantir clareza sem sobrecarga.
3.  **Requisitos Não-Funcionais**: Propor ou clarificar premissas de performance, segurança, escala e manutenção.
4.  **Understanding Lock (Gate Obrigatório)**: Fornecer um resumo do entendimento e aguardar sua confirmação explícita antes de prosseguir.
5.  **Explorar Abordagens**: Propor 2-3 caminhos viáveis com trade-offs claros.
6.  **Apresentação Incremental**: Apresentar o design em seções curtas (200-300 palavras) e validar cada uma.
7.  **Decision Log**: Manter um log de todas as decisões tomadas e por quê.

## 📄 Documentação Final
Uma vez validado, o design deve ser movido para um formato durável (ex: `implementation_plan.md` ou um arquivo na pasta `.agent/designs/`).

## ⚠️ Princípios Inegociáveis
- **YAGNI ruthlessly**: Evitar otimização prematura.
- **Assunções Explícitas**: Nunca assumir algo em silêncio; sempre listar como uma premissa.
- **Clareza > Esperteza**: Preferir soluções simples e compreensíveis.
