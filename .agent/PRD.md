# Product Requirements Document (PRD) - MonitorPRO

## 🎯 Visão Geral
O **MonitorPRO** é um ecossistema de produtividade focado em usuários com TDAH, oferecendo ferramentas de monitoramento de estudo, gamificação e organização visual minimalista. O diferencial é a **Resiliência de Dados** e a **Baixa Sobrecarga Cognitiva**.

## 🛠 Stack Tecnológica
- **Core**: React 18 + TypeScript + Vite.
- **Estilização**: Tailwind CSS + Framer Motion.
- **Backend**: Supabase (Auth, Realtime, Postgres).
- **Offline**: Dexie.js (IndexedDB) para funcionamento offline-first.
- **Estado**: Zustand (Global) + TanStack Query (Server State).

## 🛡️ Arquitetura de Sincronização (Engine V2.5)
O sistema utiliza um modelo **Offline-First com Reconciliação Conflito-Zero**:
1.  **Local-First Write**: Toda escrita ocorre primeiro no Dexie.
2.  **Universal ID Logic**: Uso de UUIDs como chave primária para evitar colisões entre dispositivos.
3.  **Deduplicação Automática**: Algoritmo de limpeza local que remove registros redundantes antes do sync.
4.  **Safe Refresh**: Fluxo de atualização que sincroniza pendências antes de limpar e recarregar o cache local.
5.  **Realtime Watcher**: Assinatura global de mudanças no Postgres para invalidar cache instantaneamente.

## 🚀 Funcionalidades Chave
1.  **Dashboard Inteligente**: Métricas de estudo com foco em progresso semanal e projeções.
2.  **Gestão de Editais**: Organização de matérias e tópicos com sistema de pesos.
3.  **Sincronização Resiliente**: Garantia de integridade multi-dispositivo (Casa vs. Escritório).
4.  **Neuroacessibilidade**: Interface minimalista com micro-animações que reduzem a ansiedade.

## 🎨 Princípios de Design (Rich Aesthetics)
- **Aesthetic Point of View**: Minimalismo Industrial / Editorial Brutalism.
- **Feedback Loop**: Notificações visuais sutis para cada ação de sync.
- **Performance**: Tempo de carregamento < 500ms e navegação instantânea.

## 📈 Roadmap & Consolidação
- [x] **Estabilização de Sync**: Motor V2.5 com reconciliação automática de IDs.
- [x] **Pruning (Fase 1)**: Remoção da Biblioteca PDF para focar em core features e performance.
- [ ] **Novo Dashboard**: Criar visualizações de progresso baseadas na nova estrutura de dados limpa.
- [ ] **Gamificação**: Sistema de streaks baseado em registros reais sincronizados.
