import { ExamBoard } from '../constants/examBoards';

export interface BoardScoreResult {
  correct: number;
  incorrect: number;
  blank: number;
  total: number;
  rawScore: number;
  maxScore: number;
  percentage: number;
}

export function calculateBoardScore(
  board: ExamBoard,
  correct: number,
  incorrect: number,
  blank: number
): BoardScoreResult {
  const total = correct + incorrect + blank;
  let rawScore: number;

  if (board === 'CESPE') {
    // CESPE: cada certo = +1, cada errado = -1, branco = 0
    rawScore = correct - incorrect;
  } else {
    // Standard: só conta acertos
    rawScore = correct;
  }

  const maxScore = board === 'CESPE' ? total : total - blank;
  const percentage = maxScore > 0 ? Math.max(0, (rawScore / maxScore) * 100) : 0;

  return {
    correct, incorrect, blank, total,
    rawScore: Math.max(0, rawScore),
    maxScore,
    percentage,
  };
}

export function formatBoardScore(
  board: ExamBoard,
  correct: number,
  incorrect: number,
  blank: number
): string {
  const result = calculateBoardScore(board, correct, incorrect, blank);
  if (board === 'CESPE') {
    return `${result.rawScore.toFixed(0)}/${result.maxScore} (${result.percentage.toFixed(1)}%)`;
  }
  return `${result.correct}/${result.total} (${result.percentage.toFixed(1)}%)`;
}
