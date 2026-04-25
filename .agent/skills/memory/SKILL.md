---
name: memory
description: "Memory is the cornerstone of intelligent agents. This skill covers short-term, long-term, and cognitive architectures (CoALA) for MonitorPRO."
---

# Agent Memory Systems (MonitorPRO)

Memory is the cornerstone of intelligent agents. Without it, every interaction starts from zero. This skill covers the architecture of agent memory: short-term (context window), long-term (vector stores), and the cognitive architectures that organize them.

## 🧠 Princípios de Memória
- **Qualidade > Quantidade**: A recuperação (retrieval) é mais importante que o armazenamento puro.
- **Contexto é Tudo**: Evite o isolamento de contexto; chunks devem ser auto-explicativos.
- **Decaimento Inteligente**: Nem tudo deve ser eterno. Memórias antigas ou irrelevantes devem perder peso.

## 📂 Arquitetura de Memória (Framework CoALA)
1.  **Memória Semântica**: Fatos e conhecimentos permanentes (ex: Preferências do usuário, regras do Supabase).
2.  **Memória Episódica**: Experiências e eventos (ex: Logs de conversas passadas, soluções de bugs específicos).
3.  **Memória Procedural**: "Como fazer" (ex: Workflows de build, padrões de design do MonitorPRO).

## 🛠️ Estratégias de Recuperação (Retrieval)
- **Filtro de Metadados**: Sempre filtrar por `user_id` e `type` antes da busca semântica.
- **Hybrid Search**: Combinar busca vetorial com palavras-chave (Keyword match).
- **Reranking**: Re-avaliar os top-k resultados para garantir máxima relevância antes de inserir no contexto.

## ✂️ Chunking no MonitorPRO
Para este projeto, usaremos:
- **Código**: Chunking baseado em funções/classes (Language-aware).
- **Documentação**: 512 tokens com 10-20% de overlap.
- **Contextual Chunking**: Adicionar um pequeno resumo do documento a cada fragmento para evitar perda de sentido.

## ⚠️ Sharp Edges (Riscos)
- **Perda de Contexto**: Chunks isolados podem perder o significado (ex: "esta função" sem o nome da classe).
- **Memórias Conflitantes**: Preferências antigas podem sobrescrever novas se não houver um sistema de versão ou data.
- **Estouro de Contexto**: Recuperar memórias demais pode "empurrar" o prompt do sistema ou a query atual para fora da janela de contexto.
