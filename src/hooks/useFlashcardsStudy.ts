import { useState, useEffect, useRef } from 'react';
import { flashcardsQueries } from '../services/queries';
import { Flashcard } from '../types';
import { smartShuffle, sm2 } from '../utils/flashcards';
import { generateStudyPlan } from '../utils/scheduler';
import type { SchedulerConfig } from '../utils/scheduler';
import { logger } from '../utils/logger';

interface UseFlashcardsStudyProps {
  filteredCards: Flashcard[];
  onCardResult: () => void;
  schedulerConfig?: SchedulerConfig;
}

export const useFlashcardsStudy = ({
  filteredCards,
  onCardResult,
  schedulerConfig = { dailyNewCards: 20, mode: 'normal' },
}: UseFlashcardsStudyProps) => {
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ learned: 0, review: 0, total: 0 });
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const currentCard = studyQueue[currentCardIndex];

  const lastCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (studyQueue.length > 0 && currentCardIndex < studyQueue.length) {
      const card = studyQueue[currentCardIndex];
      if (lastCardIdRef.current !== card.id) {
        setIsFlipped(false);
        lastCardIdRef.current = card.id;
      }
    }
  }, [currentCardIndex, studyQueue]);

  const startStudySession = () => {
    const studyable = filteredCards.filter(card =>
      card.status === 'novo' ||
      card.status === 'aprendendo' ||
      card.status === 'revisando' ||
      card.status === 'revisar' ||
      card.status === 'pendente'
    );

    if (studyable.length === 0) {
      alert('Nenhum card para estudar com os filtros atuais!');
      return;
    }

    const plan = generateStudyPlan(studyable, schedulerConfig);

    const finalQueue = [
      ...smartShuffle([...plan.dueCards]),
      ...smartShuffle([...plan.newCards]),
    ];

    setStudyQueue(finalQueue);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionStats({ learned: 0, review: 0, total: finalQueue.length });
    setShowSessionSummary(false);
  };

  const endSession = () => {
    setStudyQueue([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSessionSummary(false);
  };

  const handleCardResult = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;

    const result = sm2(rating, currentCard.interval || 0, currentCard.ease_factor || 2.5, currentCard.status);
    if (result.reviewed) setSessionStats(prev => ({ ...prev, review: prev.review + 1 }));
    if (result.learned) setSessionStats(prev => ({ ...prev, learned: prev.learned + 1 }));

    try {
      await flashcardsQueries.update(currentCard.id, {
        status: result.status,
        interval: result.interval,
        ease_factor: result.easeFactor,
        next_review: result.nextReview.toISOString()
      });
      onCardResult();
    } catch (error) {
      logger.error('DATA', 'Erro ao atualizar card:', error);
    }

    const nextIndex = currentCardIndex + 1;
    if (nextIndex < studyQueue.length) {
      setCurrentCardIndex(nextIndex);
    } else {
      setShowSessionSummary(true);
    }
  };

  return {
    studyQueue, setStudyQueue,
    currentCardIndex, setCurrentCardIndex,
    isFlipped, setIsFlipped,
    sessionStats, showSessionSummary,
    currentCard,
    startStudySession, endSession, handleCardResult,
  };
};
