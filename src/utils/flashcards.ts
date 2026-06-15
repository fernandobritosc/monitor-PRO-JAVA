import { Flashcard } from '../types';
import { normalizeText, getSimilarity } from './text';

export const smartShuffle = (inputCards: Flashcard[]) => {
  const groups: Record<string, Flashcard[]> = {};
  inputCards.forEach(c => { if (!groups[c.materia]) groups[c.materia] = []; groups[c.materia].push(c); });
  Object.keys(groups).forEach(key => { groups[key] = groups[key].sort(() => Math.random() - 0.5); });
  const result: Flashcard[] = []; let lastMateria: string | null = null; let remainingCount = inputCards.length;
  while (remainingCount > 0) {
    const availableMaterias = Object.keys(groups).filter(k => groups[k].length > 0);
    let candidates = availableMaterias.filter(m => m !== lastMateria);
    if (candidates.length === 0) candidates = availableMaterias;
    if (candidates.length === 0) break;
    const chosenMateria = candidates[Math.floor(Math.random() * candidates.length)];
    const card = groups[chosenMateria].pop();
    if (card) { result.push(card); lastMateria = chosenMateria; remainingCount--; }
  }
  return result;
};

export const findDuplicate = (
  front: string,
  materia: string,
  cards: Flashcard[],
  editingId: string | null,
  similarityThreshold: number
) => {
  const normalizedFront = normalizeText(front);
  return cards.find(card => {
    if (editingId && card.id === editingId) return false;
    if (card.materia !== materia) return false;
    return getSimilarity(normalizedFront, normalizeText(card.front)) > similarityThreshold;
  });
};

export interface SM2Result {
  interval: number;
  easeFactor: number;
  status: Flashcard['status'];
  nextReview: Date;
  learned: boolean;
  reviewed: boolean;
}

export const sm2 = (rating: 1 | 2 | 3 | 4, currentInterval: number, currentEaseFactor: number, currentStatus: Flashcard['status']): SM2Result => {
  let newInterval = currentInterval || 0;
  let newEaseFactor = currentEaseFactor || 2.5;
  let newStatus: Flashcard['status'] = currentStatus;
  let learned = false;
  let reviewed = false;

  if (rating === 1) {
    newInterval = 0;
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
    newStatus = 'revisando';
    reviewed = true;
  } else {
    if (newInterval === 0) {
      newInterval = 1;
    } else if (newInterval === 1) {
      newInterval = 6;
    } else {
      const multiplier = rating === 2 ? 1.2 : (rating === 3 ? newEaseFactor : newEaseFactor * 1.5);
      newInterval = Math.ceil(newInterval * multiplier);
    }

    if (rating === 2) {
      newEaseFactor = Math.max(1.3, newEaseFactor - 0.15);
    } else if (rating === 4) {
      newEaseFactor = Math.min(5.0, newEaseFactor + 0.15);
    }

    newStatus = 'aprendido';
    learned = true;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return { interval: newInterval, easeFactor: newEaseFactor, status: newStatus, nextReview, learned, reviewed };
};
