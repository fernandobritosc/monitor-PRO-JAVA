import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioFlashcards } from './useAudioFlashcards';
import type { Flashcard } from '../types';

const mockCard: Flashcard = {
  id: 'card-1',
  materia: 'Direito Constitucional',
  assunto: 'Direitos Fundamentais',
  front: 'O que é o princípio da dignidade da pessoa humana?',
  back: 'Fundamento da República Federativa do Brasil, art. 1º, III CF/88.',
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

vi.mock('../services/supabase', () => ({
  getGeminiKey: vi.fn(() => 'mock-gemini-key'),
}));

vi.mock('../services/aiService', () => ({
  handlePlayRevisionAudio: vi.fn(),
  generatePodcastAudio: vi.fn(),
}));

function createMockMouseEvent(): React.MouseEvent {
  return {
    stopPropagation: vi.fn(),
  } as unknown as React.MouseEvent;
}

describe('useAudioFlashcards', () => {
  const defaultProps = {
    currentCard: mockCard,
    aiStreamText: 'Texto da explicação para áudio',
    currentCardIndex: 0,
    activeTab: 'study',
    onPodcastGenerated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar estado inicial padrão', () => {
    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isPlayingNeural).toBe(false);
    expect(result.current.stopNeural).toBeNull();
    expect(result.current.isGeneratingPodcast).toBe(false);
    expect(result.current.podcastStatus).toBe('');
  });

  it('handleSpeak: deve iniciar speech synthesis', () => {
    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    act(() => {
      result.current.handleSpeak('Texto para falar', createMockMouseEvent());
    });

    expect(result.current.isSpeaking).toBe(true);
  });

  it('handleSpeak: deve parar se já estiver falando (toggle)', () => {
    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    act(() => {
      result.current.handleSpeak('Texto', createMockMouseEvent());
    });

    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      result.current.handleSpeak('Texto', createMockMouseEvent());
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it('handlePlayNeural: não deve tocar sem aiStreamText', async () => {
    const { result } = renderHook(() => useAudioFlashcards({ ...defaultProps, aiStreamText: '' }));

    await act(async () => {
      await result.current.handlePlayNeural();
    });

    expect(result.current.isPlayingNeural).toBe(false);
  });

  it('handlePlayNeural: não deve tocar sem chave Gemini', async () => {
    const { getGeminiKey } = await import('../services/supabase');
    (getGeminiKey as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => {
      await result.current.handlePlayNeural();
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Gemini'));
    alertSpy.mockRestore();
  });

  it('handlePlayNeural: deve iniciar reprodução neural', async () => {
    const { handlePlayRevisionAudio } = await import('../services/aiService');
    (handlePlayRevisionAudio as ReturnType<typeof vi.fn>).mockResolvedValue(vi.fn());

    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    await act(async () => {
      await result.current.handlePlayNeural();
    });

    expect(handlePlayRevisionAudio as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(result.current.isPlayingNeural).toBe(true);
  });

  it('handlePlayNeural: deve parar se já estiver tocando (toggle)', async () => {
    const { handlePlayRevisionAudio } = await import('../services/aiService');
    const stopFn = vi.fn();
    (handlePlayRevisionAudio as ReturnType<typeof vi.fn>).mockResolvedValue(stopFn);

    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    await act(async () => {
      await result.current.handlePlayNeural();
    });

    expect(result.current.isPlayingNeural).toBe(true);

    await act(async () => {
      await result.current.handlePlayNeural();
    });

    expect(stopFn).toHaveBeenCalled();
    expect(result.current.isPlayingNeural).toBe(false);
  });

  it('handlePodcastDuo: não deve gerar sem aiStreamText', async () => {
    const { result } = renderHook(() => useAudioFlashcards({ ...defaultProps, aiStreamText: '' }));

    await act(async () => {
      await result.current.handlePodcastDuo();
    });

    expect(result.current.isGeneratingPodcast).toBe(false);
  });

  it('handlePodcastDuo: deve iniciar geração de podcast', async () => {
    const { generatePodcastAudio } = await import('../services/aiService');
    (generatePodcastAudio as ReturnType<typeof vi.fn>).mockImplementation(
      (_text: string, _id: string, _key: string, onStatus: (s: string) => void, _onPlay: () => void, _onStop: () => void, _onError: (e: string) => void) => {
        onStatus('Gerando...');
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useAudioFlashcards(defaultProps));

    await act(async () => {
      await result.current.handlePodcastDuo();
    });

    expect(generatePodcastAudio as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it('deve parar áudio ao desmontar', async () => {
    const stopFn = vi.fn();
    const { handlePlayRevisionAudio } = await import('../services/aiService');
    (handlePlayRevisionAudio as ReturnType<typeof vi.fn>).mockResolvedValue(stopFn);

    const { result, unmount } = renderHook(() => useAudioFlashcards(defaultProps));

    await act(async () => {
      await result.current.handlePlayNeural();
    });

    unmount();

    expect(stopFn).toHaveBeenCalled();
  });
});
