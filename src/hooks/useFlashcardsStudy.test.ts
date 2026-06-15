import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashcardsStudy } from './useFlashcardsStudy';
import type { Flashcard } from '../types';

const mockCardNovo: Flashcard = {
  id: 'card-1',
  materia: 'Direito Constitucional',
  assunto: 'Direitos Fundamentais',
  front: 'Pergunta 1?',
  back: 'Resposta 1.',
  status: 'novo',
  interval: 0,
  ease_factor: 2.5,
  next_review: null,
  ai_generated_assets: null,
  original_audio_id: null,
  author_name: 'test',
  created_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
};

const mockCardRevisao: Flashcard = {
  ...mockCardNovo,
  id: 'card-2',
  front: 'Pergunta 2?',
  back: 'Resposta 2.',
  status: 'revisar',
};

const mockCardAprendido: Flashcard = {
  ...mockCardNovo,
  id: 'card-3',
  front: 'Pergunta 3?',
  back: 'Resposta 3.',
  status: 'aprendido',
};

vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

vi.mock('../utils/flashcards', () => ({
  smartShuffle: vi.fn(<T>(arr: T[]) => arr),
  sm2: vi.fn(),
}));

describe('useFlashcardsStudy', () => {
  const onCardResult = vi.fn();
  const defaultFilteredCards = [mockCardNovo, mockCardRevisao];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar estado inicial padrão', () => {
    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: [],
      onCardResult,
    }));

    expect(result.current.studyQueue).toEqual([]);
    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.isFlipped).toBe(false);
    expect(result.current.currentCard).toBeUndefined();
    expect(result.current.showSessionSummary).toBe(false);
  });

  it('startStudySession: deve iniciar sessão com cards studiáveis', () => {
    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: defaultFilteredCards,
      onCardResult,
    }));

    act(() => {
      result.current.startStudySession();
    });

    expect(result.current.studyQueue.length).toBe(2);
    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.isFlipped).toBe(false);
    expect(result.current.showSessionSummary).toBe(false);
    expect(result.current.sessionStats.total).toBe(2);
  });

  it('startStudySession: deve ignorar cards "aprendido"', () => {
    const cards = [mockCardNovo, mockCardAprendido];

    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: cards,
      onCardResult,
    }));

    act(() => {
      result.current.startStudySession();
    });

    expect(result.current.studyQueue.length).toBe(1);
  });

  it('startStudySession: deve alertar se não houver cards studiáveis', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: [mockCardAprendido],
      onCardResult,
    }));

    act(() => {
      result.current.startStudySession();
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(result.current.studyQueue).toEqual([]);
    alertSpy.mockRestore();
  });

  it('endSession: deve limpar sessão e resetar estado', () => {
    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: defaultFilteredCards,
      onCardResult,
    }));

    act(() => {
      result.current.startStudySession();
    });

    expect(result.current.studyQueue.length).toBeGreaterThan(0);

    act(() => {
      result.current.endSession();
    });

    expect(result.current.studyQueue).toEqual([]);
    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.isFlipped).toBe(false);
    expect(result.current.showSessionSummary).toBe(false);
  });

  it('handleCardResult: deve atualizar o card e avançar para o próximo', async () => {
    const { sm2 } = await import('../utils/flashcards');
    (sm2 as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'aprendendo',
      interval: 1,
      easeFactor: 2.5,
      nextReview: new Date(),
      reviewed: true,
      learned: false,
    });

    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: defaultFilteredCards,
      onCardResult,
    }));

    act(() => {
      result.current.startStudySession();
    });

    const firstCardId = result.current.currentCard?.id;

    await act(async () => {
      await result.current.handleCardResult(3);
    });

    expect(sm2 as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(onCardResult).toHaveBeenCalled();
    expect(result.current.currentCard?.id).not.toBe(firstCardId);
  });

  it('handleCardResult: deve mostrar sumário no último card', async () => {
    const { sm2 } = await import('../utils/flashcards');
    (sm2 as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'aprendendo',
      interval: 1,
      easeFactor: 2.5,
      nextReview: new Date(),
      reviewed: true,
      learned: false,
    });

    const { result } = renderHook(() => useFlashcardsStudy({
      filteredCards: [mockCardNovo],
      onCardResult,
    }));

    act(() => {
      result.current.startStudySession();
    });

    expect(result.current.showSessionSummary).toBe(false);

    await act(async () => {
      await result.current.handleCardResult(4);
    });

    expect(result.current.showSessionSummary).toBe(true);
  });

  it('deve desvirar o card ao trocar de índice', () => {
    const { result } = renderHook(
      (props) => useFlashcardsStudy(props),
      { initialProps: { filteredCards: defaultFilteredCards, onCardResult } }
    );

    act(() => {
      result.current.startStudySession();
    });

    act(() => {
      result.current.setIsFlipped(true);
    });

    expect(result.current.isFlipped).toBe(true);

    act(() => {
      result.current.setCurrentCardIndex(1);
    });

    expect(result.current.isFlipped).toBe(false);
  });
});
