---
name: conversation-memory
description: "Persistent memory systems for LLM conversations including short-term, long-term, and entity-based memory."
---

# Conversation Memory (MonitorPRO)

Este sistema de memória garante que o MonitorPRO aprenda com cada interação do usuário, mantendo a relevância e a privacidade.

## 🏗️ Tiered Memory System (Camadas)
1. **Buffer**: Conversa atual mantida diretamente no contexto.
2. **Short-term**: Interações recentes (sessão atual) para manter o fluxo imediato.
3. **Long-term**: Memórias persistentes entre sessões (armazenadas via Supabase/Dexie).
4. **Entity Memory**: Fatos específicos sobre o usuário (preferências, metas de estudo, dificuldades recorrentes).

## 👤 Entity Memory (Fatos do Usuário)
Armazenamos e atualizamos fatos sobre entidades (Pessoas, Objetos, Conceitos).
- **Exemplo**: "O usuário prefere estudar à noite", "O usuário tem dificuldade com React Hooks".

## 🛡️ Isolação de Usuário (Privacidade)
**REGRA CRÍTICA**: Nunca recuperar memórias de um usuário para outro.
- Todas as operações de memória devem incluir obrigatoriamente um `user_id`.
- Filtros rigorosos no Supabase RLS (Row Level Security) devem ser validados.

## 🧹 Manutenção e Limpeza
- **Consolidação**: Memórias importantes do Short-term são movidas para Long-term após a sessão.
- **Score de Importância**: Nem todo chat é uma memória. Filtramos por relevância (decisões, preferências, fatos novos).
- **Unbounded Growth**: Implementamos limpeza periódica para evitar lentidão na recuperação (retrieval).

## ⚠️ Sharp Edges
- **Crescimento Infinito**: Memórias sem limpeza causam latência e custos altos.
- **Irrelevância**: Recuperar memórias que não ajudam na query atual confunde o modelo.
- **Vazamento de Dados**: Falta de isolamento por `user_id` é uma falha de segurança crítica.
