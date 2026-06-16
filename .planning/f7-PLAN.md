# Fase 7 — Plano de Execução: Features Avançadas

> **Fase:** 7 | **ROADMAP:** F7:M1 e F7:M3

---

## Wave 1 — Agendador Inteligente de Revisões (M1)

### T1: Criar `src/utils/scheduler.ts`

Algoritmo que prioriza cards com base na curva de esquecimento + disponibilidade:

1. `getDueCards(cards, limit?)` — filtra cards com `next_review <= today`, ordena por urgência
2. `prioritizeByDifficulty(cards)` — cards com `easeFactor` baixo ganham prioridade
3. `estimateDailyLoad(cards, availableMinutes)` — estima quantos cards cabem no tempo disponível
4. `generateStudyPlan(cards, config)` — combina cards novos + revisões de forma balanceada

### T2: Atualizar `useFlashcardsStudy.ts`

Modificar `startStudySession` para usar o scheduler:
- Priorizar revisões vencidas primeiro
- Limitar novos cards por sessão
- Mostrar estimativa de tempo

### T3: Criar `src/components/features/flashcards/SchedulerConfig.tsx`

Painel de configuração do scheduler:
- Limite de novos cards por dia
- Modo: "Normal" (balanceado), "Turbo" (máximo de revisões), "Suave" (só revisões)
- Previsão de cards para hoje

---

## Wave 2 — Modo Banca Personalizado (M3)

### T4: Criar `src/constants/examBoards.ts`

Definição das bancas:
```typescript
export type ExamBoard = 'CESPE' | 'FCC' | 'FGV' | 'VUNESP';

export interface BoardConfig {
  name: string;
  scoring: 'standard' | 'cespe' | 'weighted';
  negativeMarking?: number; // ex: CESPE = -1.0 (perde uma certa)
  alternatives: number; // 4 (FGV) ou 5 (FCC/CESPE/VUNESP)
  passingGrade?: number;
}
```

### T5: Atualizar `SimuladoFormSection.tsx`

Adicionar seletor de banca com regras específicas:
- CESPE: colunas Certo/Errado em branco (questões do tipo "C E")
- FCC: 5 alternativas, sem peso negativo
- FGV: 4 alternativas
- VUNESP: 5 alternativas

### T6: Score calculator por banca

Criar `src/utils/boardScoring.ts` com:
- `calculateCESPE(hits, misses)` — Certo/Errado com pontuação negativa
- `calculateStandard(hits, total)` — Pontuação normal
- Score adaptado ao tipo de banca

---

## Verificação Final

```bash
npx tsc --noEmit
npm run lint
npm run test
```
