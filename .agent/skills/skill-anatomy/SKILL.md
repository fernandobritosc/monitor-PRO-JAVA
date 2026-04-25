---
name: skill-anatomy
description: "Guia definitivo sobre a estrutura, metadados e anatomia de uma Skill no Antigravity Kit."
---

# Anatomy of a Skill - MonitorPRO Standard

Este guia define como as habilidades devem ser estruturadas para garantir que o agente as entenda perfeitamente.

## 📁 Estrutura de Pastas
```
skills/
└── nome-da-skill/
    ├── SKILL.md         ← Obrigatório: Definição principal
    ├── examples/        ← Opcional: Exemplos de código
    ├── scripts/         ← Opcional: Scripts auxiliares (Python/Bash)
    ├── templates/       ← Opcional: Templates de código
    └── references/      ← Opcional: Documentação de API
```

## 📝 O arquivo SKILL.md

### 1. Frontmatter (Metadados)
Deve conter:
- `name`: Identificador único (lowercase-com-hifens).
- `description`: Resumo de uma frase (gatilho para o agente).
- `risk`: Classificação de segurança (`safe`, `critical`, etc).

### 2. Conteúdo (Instruções)
Seções recomendadas:
- **Overview**: O que é e por que existe.
- **When to Use**: Cenários de ativação.
- **How It Works**: Passo a passo detalhado.
- **Best Practices**: O que fazer e o que evitar.
- **Sharp Edges**: Riscos e problemas comuns.

## 💡 Dicas de Escrita
- Use linguagem direta e ativa ("Crie o arquivo..." em vez de "O arquivo deve ser criado...").
- Seja específico: forneça comandos e caminhos de arquivos claros.
- Use exemplos reais para mostrar ao agente o que é um "output de qualidade".

## ✅ Checklist de Qualidade
- [ ] O nome da pasta é igual ao `name` no frontmatter?
- [ ] A descrição é clara e contém palavras-chave de ativação?
- [ ] As instruções são acionáveis e sem ambiguidades?
- [ ] Existem exemplos de código com sintaxe destacada?
