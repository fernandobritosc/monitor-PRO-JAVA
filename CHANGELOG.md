# ChangeLog - MonitorPro

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

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
