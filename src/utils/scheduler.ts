import { Flashcard } from '../types';

export interface SchedulerConfig {
  dailyNewCards: number;
  mode: 'normal' | 'turbo' | 'suave';
}

export interface StudyPlan {
  dueCards: Flashcard[];
  newCards: Flashcard[];
  estimatedMinutes: number;
}

export function getDueCards(cards: Flashcard[]): Flashcard[] {
  const now = new Date();
  return cards
    .filter(c => {
      // Cards with a past next_review date are due
      if (c.next_review && new Date(c.next_review) <= now) return true;
      // Cards that need review even without a date set (e.g. 'revisar', 'aprendendo', 'revisando')
      if (
        !c.next_review &&
        (c.status === 'revisar' ||
          c.status === 'aprendendo' ||
          c.status === 'revisando')
      )
        return true;
      return false;
    })
    .sort((a, b) => {
      // Overdue cards first (positive = more overdue)
      const aOverdue = a.next_review
        ? now.getTime() - new Date(a.next_review).getTime()
        : 999999; // Cards without dates treated as most overdue
      const bOverdue = b.next_review
        ? now.getTime() - new Date(b.next_review).getTime()
        : 999999;
      return bOverdue - aOverdue;
    });
}

export function prioritizeByDifficulty(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort((a, b) => {
    // Lower ease factor = harder = higher priority
    const aEase = a.ease_factor ?? 2.5;
    const bEase = b.ease_factor ?? 2.5;
    return aEase - bEase;
  });
}

export function estimateDailyLoad(
  cards: Flashcard[],
  availableMinutes: number,
): number {
  const avgTimePerCard = 1.5; // 1.5 minutes per card average
  return Math.floor(availableMinutes / avgTimePerCard);
}

export function generateStudyPlan(
  cards: Flashcard[],
  config: SchedulerConfig,
): StudyPlan {
  const dueCards = getDueCards(cards);
  const newCards = cards.filter(
    c => c.status === 'novo' || c.status === 'pendente',
  );

  let selectedDue: Flashcard[];
  let selectedNew: Flashcard[];

  switch (config.mode) {
    case 'turbo':
      selectedDue = prioritizeByDifficulty(dueCards);
      selectedNew = newCards.slice(0, config.dailyNewCards * 2);
      break;
    case 'suave':
      selectedDue = prioritizeByDifficulty(dueCards).slice(
        0,
        Math.ceil(dueCards.length / 2),
      );
      selectedNew = [];
      break;
    default: // normal
      selectedDue = prioritizeByDifficulty(dueCards);
      selectedNew = newCards.slice(0, config.dailyNewCards);
  }

  const planCards = [...selectedDue, ...selectedNew];
  const estimatedMinutes = Math.ceil(planCards.length * 1.5);

  return {
    dueCards: selectedDue,
    newCards: selectedNew,
    estimatedMinutes,
  };
}
