---
phase: 7
plan: m3
subsystem: study-form
tags: [exam-board, scoring, cespe, simulado, banca]
dependency-graph:
  requires: []
  provides: [exam-board-constants, board-scoring-utils, board-selector-ui]
  affects: [SimuladoFormSection, StudyForm, StudyRecord]
tech-stack:
  added:
    - constants/examBoards: ExamBoard type + EXAM_BOARDS config map
    - utils/boardScoring: CESPE/standard score calculation
  patterns:
    - Board config pattern using Record<ExamBoard, BoardConfig>
key-files:
  created:
    - src/constants/examBoards.ts
    - src/utils/boardScoring.ts
  modified:
    - src/types.ts
    - src/components/features/study/SimuladoFormSection.tsx
    - src/views/StudyForm.tsx
decisions:
  - ExamBoard made a required prop on SimuladoFormSection — parent must supply it
  - CESPE blank column shown as placeholder (no input) — data model doesn't yet have per-materia blank tracking
  - Props made required rather than optional with defaults — enforces board awareness in parent
metrics:
  duration: ~15min
  completed_date: 2026-06-15
---

# Phase 7 Plan M3: Modo Banca Personalizado Summary

**One-liner:** Exam board selector with CESPE/FCC/FGV/VUNESP/PERSONALIZADO configurations, CESPE-aware score grid with blank column, and board-aware score calculation utility.

## Files Created

### `src/constants/examBoards.ts`
- Defines `ExamBoard` union type: `'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'PERSONALIZADO'`
- `BoardConfig` interface with scoring mode, negative marking, alternatives count, blank support
- `EXAM_BOARDS` constant with CESPE (Certo/Errado, -1 penalty), FCC (5 alt), FGV (4 alt), VUNESP (5 alt), PERSONALIZADO (customizable)

### `src/utils/boardScoring.ts`
- `calculateBoardScore()` — computes raw score based on board rules (CESPE: correct - incorrect, Standard: correct only)
- `formatBoardScore()` — returns formatted score string appropriate to board type
- `BoardScoreResult` interface with correct, incorrect, blank, total, rawScore, maxScore, percentage

## Files Modified

### `src/types.ts`
- Added `exam_board?: string` to `StudyRecord` for persisting the selected board
- Added `blank_answers?: number` and `incorrect_answers?: number` for CESPE-specific data

### `src/components/features/study/SimuladoFormSection.tsx`
- New required props: `board: ExamBoard` and `onBoardChange: (board: ExamBoard) => void`
- Added styled board selector dropdown with dark theme styling (matching existing design system)
- Board description shown below selector with negative marking warning for CESPE
- When CESPE selected: grid adapts to show "Em Branco" column header + placeholder cells
- Column widths adjust dynamically (12-column grid: 5/2/2/3 for CESPE, 6/3/3 for standard)

### `src/views/StudyForm.tsx` (parent — deviation fix)
- Added `examBoard` state with `useState<ExamBoard>('CESPE')`
- Passes `board` and `onBoardChange` to `SimuladoFormSection`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Parent component missing required props**
- **Found during:** Task 3 (SimuladoFormSection)
- **Issue:** Adding required `board` and `onBoardChange` props broke TypeScript compilation in `StudyForm.tsx`
- **Fix:** Added `examBoard` state to parent and passed it as props
- **Files modified:** `src/views/StudyForm.tsx`
- **Commit:** `c36d8236`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ No type errors |
| `npm run lint` | ✅ No new lint errors (0 errors from modified files) |
| `npm run test` | ✅ 114 tests passed, 11 test files |

## Commits

| Hash | Message |
|------|---------|
| `b64ff2d3` | feat(f7-m3): create exam board constants and board scoring utility |
| `7b7cc96f` | feat(f7-m3): add exam_board, blank_answers, incorrect_answers to StudyRecord type |
| `c36d8236` | feat(f7-m3): add exam board selector to SimuladoFormSection |

## Self-Check: PASSED

### Created Files
- ✅ `src/constants/examBoards.ts` — FOUND
- ✅ `src/utils/boardScoring.ts` — FOUND

### Commits
- ✅ `b64ff2d3` — FOUND
- ✅ `7b7cc96f` — FOUND
- ✅ `c36d8236` — FOUND
