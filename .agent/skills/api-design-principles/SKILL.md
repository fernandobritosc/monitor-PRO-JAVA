---
name: api-design-principles
description: "Mestre em princípios de design de API REST e GraphQL para construir interfaces intuitivas, escaláveis e fáceis de manter."
---

# API Design Principles (MonitorPRO)

O objetivo desta skill é garantir que as APIs do MonitorPRO sejam consistentes e "deliciem" os desenvolvedores que as utilizam.

## 🎯 Quando Usar
- Ao desenhar novos endpoints REST ou queries/mutations GraphQL.
- Refatorar APIs existentes para melhor usabilidade.
- Estabelecer padrões de contrato (Versioning, Auth, Pagination).

## 🔄 O Processo de Design
1.  **Definir Consumidores**: Identificar quem usará a API e quais os casos de uso.
2.  **Modelagem de Recursos**: Escolher entre REST ou GraphQL e modelar os tipos de dados.
3.  **Especificação Técnica**:
    - Erros: Formato padrão de erro.
    - Versionamento: Estratégia de evolução sem quebra (Breaking changes).
    - Paginação: Cursor-based ou Offset-based.
    - Auth Strategy: Como proteger os recursos.
4.  **Validação**: Revisar a consistência e fornecer exemplos claros.

## 🛠️ Instruções
- Priorize a semântica HTTP no REST e a eficiência de seleção no GraphQL.
- Mantenha a consistência de nomenclatura (CamelCase, SnakeCase, etc.) em toda a API.
- Consulte `resources/implementation-playbook.md` para padrões detalhados.

## ⚠️ Limitações
- Não use esta skill para guias de frameworks específicos (ex: "como usar Express").
- O foco é o **contrato**, não a infraestrutura.
