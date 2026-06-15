import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIFlashcards, type UseAIFlashcardsProps } from './useAIFlashcards';
import type { Flashcard } from '../types';
import type { AIProviderName } from '../services/aiService';

const mockCard: Flashcard = {
  id: 'card-1',
  concurso: 'Geral',
  materia: 'Direito Constitucional',
  assunto: 'Direitos Fundamentais',
  front: 'O que é o princípio da dignidade da pessoa humana?',
  back: 'Fundamento da República Federativa do Brasil, art. 1º, III CF/88.',
  status: 'novo',
  interval: 0,
  ease_factor: 2.5,
  author_name: 'test',
  created_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
};

vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  getGeminiKey: vi.fn(() => 'mock-gemini-key'),
  getGroqKey: vi.fn(() => 'mock-groq-key'),
}));

vi.mock('../services/aiService', () => ({
  streamAIContent: vi.fn(),
  generateAIContent: vi.fn(),
}));

describe('useAIFlashcards', () => {
  const defaultProps = {
    currentCard: mockCard,
    studyQueue: [mockCard],
    currentCardIndex: 0,
    setStudyQueue: vi.fn(),
    selectedAI: 'auto' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar estado inicial padrão', () => {
    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    expect(result.current.aiStreamText).toBe('');
    expect(result.current.aiLoading).toBe(false);
    expect(result.current.mnemonicText).toBe('');
    expect(result.current.mnemonicLoading).toBe(false);
    expect(result.current.extraFormat).toBeNull();
    expect(result.current.extraContent).toBe('');
    expect(result.current.extraLoading).toBe(false);
    expect(result.current.followUpQuery).toBe('');
    expect(result.current.activeAiTool).toBe('explanation');
  });

  it('deve carregar explanation salva ao trocar de card', () => {
    const cardSemAsset: Flashcard = {
      ...mockCard,
      id: 'card-sem-asset',
    };
    const cardComAsset: Flashcard = {
      ...mockCard,
      id: 'card-com-asset',
      ai_generated_assets: { explanation: 'Explicação salva anteriormente' },
    };
    const queue = [cardSemAsset, cardComAsset];

    const { result, rerender } = renderHook(
      (props) => useAIFlashcards(props),
      { initialProps: { ...defaultProps, studyQueue: queue, currentCard: cardSemAsset, currentCardIndex: 0 } }
    );

    rerender({ ...defaultProps, studyQueue: queue, currentCard: cardComAsset, currentCardIndex: 1 });

    expect(result.current.aiStreamText).toBe('Explicação salva anteriormente');
  });

  it('generateAIExplanation: deve chamar streamAIContent com os parâmetros corretos', async () => {
    const { streamAIContent } = await import('../services/aiService');
    const mockStream = streamAIContent as ReturnType<typeof vi.fn>;
    mockStream.mockImplementation((_prompt: string, callbacks: { onComplete: () => void }) => {
      callbacks.onComplete();
    });

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    await act(async () => {
      await result.current.generateAIExplanation();
    });

    expect(mockStream).toHaveBeenCalledOnce();
    const prompt = mockStream.mock.calls[0][0];
    expect(prompt).toContain(mockCard.front);
    expect(prompt).toContain(mockCard.back);
  });

  it('generateAIExplanation: não deve chamar se já estiver carregando', async () => {
    const { streamAIContent } = await import('../services/aiService');
    (streamAIContent as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    act(() => {
      result.current.generateAIExplanation();
    });

    (streamAIContent as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => {
      await result.current.generateAIExplanation();
    });

    expect(streamAIContent as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('generateAIExplanation: não deve chamar sem currentCard', async () => {
    const { streamAIContent } = await import('../services/aiService');

    const { result } = renderHook(() => useAIFlashcards({ ...defaultProps, currentCard: undefined }));

    await act(async () => {
      await result.current.generateAIExplanation();
    });

    expect(streamAIContent as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('handleGenerateMnemonic: deve gerar mnemônico e chamar saveAiAsset', async () => {
    const { generateAIContent } = await import('../services/aiService');
    (generateAIContent as ReturnType<typeof vi.fn>).mockResolvedValue('Mnemônico gerado!');

    const setStudyQueue = vi.fn();
    const { result } = renderHook(() => useAIFlashcards({ ...defaultProps, setStudyQueue }));

    await act(async () => {
      await result.current.handleGenerateMnemonic();
    });

    expect(result.current.mnemonicText).toBe('Mnemônico gerado!');
    expect(result.current.mnemonicLoading).toBe(false);
    expect(setStudyQueue).toHaveBeenCalled();
  });

  it('handleGenerateMnemonic: deve mostrar erro amigável em caso de falha', async () => {
    const { generateAIContent } = await import('../services/aiService');
    (generateAIContent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API falhou'));

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    await act(async () => {
      await result.current.handleGenerateMnemonic();
    });

    expect(result.current.mnemonicText).toContain('não foi possível');
    expect(result.current.mnemonicLoading).toBe(false);
  });

  it('handleGenerateExtraFormat: deve gerar formato extra e salvar asset', async () => {
    const { generateAIContent } = await import('../services/aiService');
    (generateAIContent as ReturnType<typeof vi.fn>).mockResolvedValue('Conteúdo do mapa');

    const setStudyQueue = vi.fn();
    const { result } = renderHook(() => useAIFlashcards({ ...defaultProps, setStudyQueue }));

    await act(async () => {
      await result.current.handleGenerateExtraFormat('mapa');
    });

    expect(result.current.extraContent).toBe('Conteúdo do mapa');
    expect(result.current.extraFormat).toBe('mapa');
    expect(result.current.activeAiTool).toBe('mapa');
    expect(result.current.extraLoading).toBe(false);
  });

  it('handleGenerateExtraFormat: deve tratar resposta vazia como erro', async () => {
    const { generateAIContent } = await import('../services/aiService');
    (generateAIContent as ReturnType<typeof vi.fn>).mockResolvedValue('');

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    await act(async () => {
      await result.current.handleGenerateExtraFormat('fluxo');
    });

    expect(result.current.extraContent).toContain('não foi possível');
    expect(result.current.extraLoading).toBe(false);
  });

  it('handleSendFollowUp: não deve enviar sem followUpQuery', async () => {
    const { streamAIContent } = await import('../services/aiService');

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    act(() => {
      result.current.setAiStreamText('algum texto');
    });

    await act(async () => {
      await result.current.handleSendFollowUp();
    });

    expect(streamAIContent as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('handleSendFollowUp: deve enviar follow-up com contexto', async () => {
    const { streamAIContent } = await import('../services/aiService');
    (streamAIContent as ReturnType<typeof vi.fn>).mockImplementation((_prompt: string, callbacks: { onComplete: () => void }) => {
      callbacks.onComplete();
    });

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    act(() => {
      result.current.setAiStreamText('Explicação inicial...');
    });

    act(() => {
      result.current.setFollowUpQuery('Explique mais?');
    });

    await act(async () => {
      await result.current.handleSendFollowUp();
    });

    expect(result.current.followUpQuery).toBe('');
    expect(streamAIContent as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it('deve resetar states ao trocar selectedAI', () => {
    const { result, rerender } = renderHook(
      (props: UseAIFlashcardsProps) => useAIFlashcards(props as UseAIFlashcardsProps),
      { initialProps: defaultProps as UseAIFlashcardsProps }
    );

    act(() => {
      result.current.setAiStreamText('texto');
      result.current.setMnemonicText('mnemônico');
    });

    rerender({ ...defaultProps, selectedAI: 'gemini' } as UseAIFlashcardsProps);

    expect(result.current.aiStreamText).toBe('');
    expect(result.current.mnemonicText).toBe('');
    expect(result.current.extraFormat).toBeNull();
    expect(result.current.extraContent).toBe('');
  });

    it('deve resetar AI texts quando studyQueue muda de vazio para preenchido', () => {
    const { result, rerender } = renderHook(
      (props: UseAIFlashcardsProps) => useAIFlashcards(props),
      { initialProps: { ...defaultProps, studyQueue: [] } as UseAIFlashcardsProps }
    );

    act(() => {
      result.current.setAiStreamText('texto antigo');
      result.current.setFollowUpQuery('pergunta');
    });

    rerender({ ...defaultProps, studyQueue: [mockCard] } as UseAIFlashcardsProps);

    expect(result.current.aiStreamText).toBe('');
    expect(result.current.followUpQuery).toBe('');
  });

  it('deve mostrar tooltip de erro quando stream falha', async () => {
    const { streamAIContent } = await import('../services/aiService');
    (streamAIContent as ReturnType<typeof vi.fn>).mockImplementation((_prompt: string, callbacks: { onError: (e: Error) => void }) => {
      callbacks.onError(new Error('API Key inválida'));
    });

    const { result } = renderHook(() => useAIFlashcards(defaultProps));

    await act(async () => {
      await result.current.generateAIExplanation();
    });

    expect(result.current.aiStreamText).toContain('Falha Crítica');
    expect(result.current.aiLoading).toBe(false);
  });

  it('handleGenerateExtraFormat: não deve chamar sem currentCard', async () => {
    const { generateAIContent } = await import('../services/aiService');

    const { result } = renderHook(() => useAIFlashcards({ ...defaultProps, currentCard: undefined }));

    await act(async () => {
      await result.current.handleGenerateExtraFormat('tabela');
    });

    expect(generateAIContent as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});
