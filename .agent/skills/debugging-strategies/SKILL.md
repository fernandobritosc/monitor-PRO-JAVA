---
name: debugging-strategies
description: "Transforma a depuração de adivinhação frustrante em resolução sistemática de problemas com estratégias comprovadas e ferramentas poderosas."
---

# Debugging Strategies (MonitorPRO)

Transforme a depuração em um processo científico e metódico.

## 🎯 Quando Usar
- Para rastrear bugs elusivos.
- Investigar problemas de performance.
- Analisar falhas de produção ou stack traces.

## 🔄 O Processo Científico de Debug
1.  **Reprodução**: Isolar o problema e capturar logs, traces e detalhes do ambiente.
2.  **Hipótese**: Formular hipóteses baseadas nas evidências.
3.  **Experimento**: Desenhar experimentos controlados para validar cada hipótese.
4.  **Narrow Scope**: Usar busca binária e instrumentação focada para reduzir o escopo do erro.
5.  **Fix & Verify**: Aplicar a correção e verificar contra os critérios originais.

## 🛠️ Instruções
- Capture detalhes do ambiente antes de qualquer alteração.
- Não faça mudanças aleatórias; cada alteração deve testar uma hipótese específica.
- Se o playbook detalhado for necessário, consulte `resources/implementation-playbook.md`.

## ⚠️ Limitações
- Use esta skill apenas quando houver um problema observável ou sintoma.
- Não substitua a validação em ambiente real por suposições de IA.
