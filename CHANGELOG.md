# ChangeLog - MonitorPro

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.33] - 2026-04-21
### Corrigido
- **Sincronização blindada**: Registros agora começam como `pending` até confirmação real do Supabase, eliminando perda silenciosa por RLS.
- **Proteção contra perda de dados**: Registros locais órfãos são re-sincronizados automaticamente em vez de deletados.
- **Re-sync periódico**: Background sync a cada 2 minutos captura qualquer pendência automaticamente.
- **Race condition de auth**: Dashboard não renderiza mais com `userId: undefined`.
- **Filtro de missão inteligente**: Se a missão ativa não tem dados, exibe visão global automaticamente.

### Removido
- Logs de debug temporários (`[SYNC-DEBUG]`, `[HomeView]`) adicionados durante diagnóstico.

## [1.0.32] - 2026-03-01
### Adicionado
- Integração completa do **Laboratório Neural** no Banco de Questões.
- Sistema de Explicações por IA (Streaming), Mnemônicos e Formatos Extras (Mapas, Tabelas).
- Suporte a áudio Solo e Podcast Duo (Alex & Bia).
- Novo sistema de **Gestão de Versões e Backup** local.
- Scripts de automação: `backup.py` e `rollback.py`.
- Suporte a imagens no editor de enunciados.

### Modificado
- `QuestionsBank.tsx`: Refatoração completa para suportar IA e novo fluxo de estudo.
- `types.ts`: Adição de novos campos para ativos de IA.
- Interface do Banco de Questões: Priorização do Modo Estudo e navegação um a um.

### Corrigido
- Erros de linting e sintaxe JSX no componente `QuestionCard`.
- Funcionalidade do botão "Editar" no banco de questões.
- Seleção de resposta correta no formulário de cadastro.
