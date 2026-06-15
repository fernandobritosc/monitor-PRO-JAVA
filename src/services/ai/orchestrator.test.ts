/**
 * Testes para o Orchestrator de IA (orchestrator.ts)
 * Testa os fluxos de stream e generate com fallback entre providers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock factory usando vi.hoisted ──────────────────────────────
// A ordem de hoisting garante que as refs existam antes dos mocks
const mocks = vi.hoisted(() => {
  class MockRateLimitError extends Error {
    public readonly retryAfterMs: number;
    constructor(message: string, retryAfterMs: number) {
      super(message);
      this.name = 'RateLimitError';
      this.retryAfterMs = retryAfterMs;
    }
  }

  return {
    detectAIProvider: vi.fn<(...args: unknown[]) => unknown>(),
    streamWithGemini: vi.fn<(...args: unknown[]) => Promise<void>>(),
    streamWithGroq: vi.fn<(...args: unknown[]) => Promise<void>>(),
    getGeneratePrompt: vi.fn<(...args: unknown[]) => string>(),
    runGemini: vi.fn<(...args: unknown[]) => Promise<string>>(),
    runGroq: vi.fn<(...args: unknown[]) => Promise<string>>(),
    checkRateLimit: vi.fn<(...args: unknown[]) => unknown>(),
    setAIOperationContext: vi.fn<(...args: unknown[]) => void>(),
    captureAIError: vi.fn<(...args: unknown[]) => void>(),
    startAIPerformanceTrace: vi.fn<(...args: unknown[]) => () => void>(),
    endTrace: vi.fn<(...args: unknown[]) => void>(),
    MockRateLimitError,
  };
});

vi.mock('./provider', () => ({
  detectAIProvider: mocks.detectAIProvider,
}));

vi.mock('./gemini', () => ({
  streamWithGemini: mocks.streamWithGemini,
  getGeneratePrompt: mocks.getGeneratePrompt,
  runGemini: mocks.runGemini,
}));

vi.mock('./groq', () => ({
  streamWithGroq: mocks.streamWithGroq,
  runGroq: mocks.runGroq,
}));

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
  RateLimitError: mocks.MockRateLimitError,
}));

vi.mock('../telemetry', () => ({
  setAIOperationContext: mocks.setAIOperationContext,
  captureAIError: mocks.captureAIError,
  startAIPerformanceTrace: mocks.startAIPerformanceTrace,
}));

// ── SUT ─────────────────────────────────────────────────────────
import { streamAIContent, generateAIContent } from './orchestrator';

// ── Helpers ─────────────────────────────────────────────────────
const makeCallbacks = () => ({
  onChunk: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

const geminiConfig = { provider: 'gemini' as const, apiKey: 'gemini-key-12345' };
const groqConfig = { provider: 'groq' as const, apiKey: 'groq-key-12345' };

// ── Tests ───────────────────────────────────────────────────────
describe('generateAIContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startAIPerformanceTrace.mockReturnValue(mocks.endTrace);
    mocks.getGeneratePrompt.mockReturnValue('mocked general prompt');
    mocks.runGemini.mockResolvedValue('gemini response text');
    mocks.runGroq.mockResolvedValue('groq response text');
  });

  // ── Test 1: no keys configured ──
  describe('1. Nenhuma chave de IA configurada', () => {
    it('deve lançar "Nenhuma chave de IA configurada" quando detectAIProvider retorna null', async () => {
      mocks.detectAIProvider.mockReturnValue(null);

      await expect(generateAIContent('test prompt')).rejects.toThrow(
        'Nenhuma chave de IA configurada',
      );
    });
  });

  // ── Test 2: Gemini success ──
  describe('2. Gemini com sucesso', () => {
    it('deve chamar runGemini e retornar o resultado', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      const result = await generateAIContent('test prompt');

      expect(mocks.getGeneratePrompt).toHaveBeenCalledWith('test prompt', 'general');
      expect(mocks.runGemini).toHaveBeenCalledWith('gemini-key-12345', 'mocked general prompt');
      expect(mocks.runGroq).not.toHaveBeenCalled();
      expect(result).toBe('gemini response text');
    });
  });

  // ── Test 3: Gemini falha → fallback Groq ──
  describe('3. Gemini falha com fallback para Groq', () => {
    it('deve chamar runGroq após runGemini rejeitar', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);
      mocks.runGemini.mockRejectedValue(new Error('Gemini quota exceeded'));

      const result = await generateAIContent(
        'test prompt',
        'gemini-key-12345',
        'grook-key-12345', // >10 chars → fallback viável
      );

      expect(mocks.runGemini).toHaveBeenCalled();
      expect(mocks.runGroq).toHaveBeenCalledWith('grook-key-12345', 'mocked general prompt');
      expect(result).toBe('groq response text');
    });

    it('deve re-lançar o erro quando não há chave Groq de fallback', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);
      mocks.runGemini.mockRejectedValue(new Error('Gemini API error'));

      await expect(generateAIContent('test prompt', 'gemini-key-12345', undefined)).rejects.toThrow(
        'Gemini API error',
      );

      expect(mocks.runGroq).not.toHaveBeenCalled();
    });
  });

  // ── Test 4: contexto analise_erros ──
  describe('4. contexto analise_erros', () => {
    it('deve construir o prompt correto com stats de erro', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      const promptObj = {
        content: 'Questão 1: ...',
        stats: { gabarito: 'B', minha_resposta: 'E' },
      };

      await generateAIContent(promptObj, 'gemini-key-12345', undefined, undefined, 'analise_erros');

      // O prompt é montado inline (não passa por getGeneratePrompt)
      expect(mocks.getGeneratePrompt).not.toHaveBeenCalled();

      // Verifica que runGemini foi chamado com prompt contendo os stats
      const calledWith = mocks.runGemini.mock.calls[0][1] as string;
      expect(calledWith).toContain('Atue como um Analista de Performance');
      expect(calledWith).toContain('Gabarito Oficial: B');
      expect(calledWith).toContain('Resposta do Aluno: E');
      expect(calledWith).toContain('Questão 1: ...');
    });

    it('deve funcionar sem stats quando não fornecidos', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      await generateAIContent(
        { content: 'Simples texto' },
        'gemini-key-12345',
        undefined,
        undefined,
        'analise_erros',
      );

      const calledWith = mocks.runGemini.mock.calls[0][1] as string;
      expect(calledWith).toContain('Atue como um Analista de Performance');
      // Sem stats → não deve conter o bloco CONTEXTO DO ERRO
      expect(calledWith).not.toContain('CONTEXTO DO ERRO');
    });
  });

  // ── Test 5: contexto explicar_erro ──
  describe('5. contexto explicar_erro', () => {
    it('deve fazer JSON.parse do content e montar prompt corretamente', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      const ctxPayload = JSON.stringify({
        isCorrect: false,
        tipo_erro: 'Atenção',
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        question: 'O que é o princípio da dignidade?',
        gabarito: 'B',
        attempts: 3,
      });

      await generateAIContent(
        ctxPayload,
        'gemini-key-12345',
        undefined,
        undefined,
        'explicar_erro',
      );

      expect(mocks.getGeneratePrompt).not.toHaveBeenCalled();

      const calledWith = mocks.runGemini.mock.calls[0][1] as string;
      expect(calledWith).toContain('ERROU (Atenção)');
      expect(calledWith).toContain('Direito Constitucional');
      expect(calledWith).toContain('Direitos Fundamentais');
      expect(calledWith).toContain('O que é o princípio da dignidade?');
      expect(calledWith).toContain('Gabarito Oficial: B');
      expect(calledWith).toContain('POR QUE VOCÊ ERROU?');
      expect(calledWith).toContain('MEMORIZAÇÃO DEFINITIVA');
      expect(calledWith).not.toContain('DOMÍNIO TÉCNICO');
    });

    it('deve montar resposta correta quando isCorrect é true', async () => {
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      const ctxPayload = JSON.stringify({
        isCorrect: true,
        materia: 'Direito Administrativo',
        assunto: 'Licitações',
        question: 'Qual lei?',
        gabarito: 'C',
        attempts: 1,
      });

      await generateAIContent(
        ctxPayload,
        'gemini-key-12345',
        undefined,
        undefined,
        'explicar_erro',
      );

      const calledWith = mocks.runGemini.mock.calls[0][1] as string;
      expect(calledWith).toContain('ACERTOU (Reforço positivo e aprofundamento)');
      expect(calledWith).toContain('DOMÍNIO TÉCNICO');
      expect(calledWith).toContain('DETALHE DE ELITE');
      expect(calledWith).not.toContain('POR QUE VOCÊ ERROU?');
    });
  });
});

describe('streamAIContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startAIPerformanceTrace.mockReturnValue(mocks.endTrace);
    mocks.streamWithGemini.mockResolvedValue(undefined);
    mocks.streamWithGroq.mockResolvedValue(undefined);
  });

  // ── Test 6: rate limit bloqueia ──
  describe('6. Rate limit bloqueia o streaming', () => {
    it('deve chamar onError com RateLimitError quando rate limit atingido', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: false,
        message: 'Limite de chamadas atingido',
        retryAfterMs: 5000,
        remainingMinute: 0,
        remainingHour: 10,
      });

      const callbacks = makeCallbacks();
      await streamAIContent('test prompt', callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(mocks.MockRateLimitError));
      expect(callbacks.onError.mock.calls[0][0].message).toContain('Limite');
      expect(callbacks.onError.mock.calls[0][0].retryAfterMs).toBe(5000);
      expect(mocks.streamWithGemini).not.toHaveBeenCalled();
      expect(mocks.streamWithGroq).not.toHaveBeenCalled();
    });
  });

  // ── Test 7: Gemini stream sucesso ──
  describe('7. Gemini stream com sucesso', () => {
    it('deve chamar streamWithGemini e não chamar Groq', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: true,
        message: undefined,
        retryAfterMs: 0,
        remainingMinute: 9,
        remainingHour: 49,
      });
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      const callbacks = makeCallbacks();
      await streamAIContent('test prompt', callbacks);

      expect(mocks.streamWithGemini).toHaveBeenCalledWith(
        'gemini-key-12345',
        'test prompt',
        callbacks,
        'general',
      );
      expect(mocks.streamWithGroq).not.toHaveBeenCalled();
      expect(mocks.setAIOperationContext).toHaveBeenCalledWith({
        provider: 'gemini',
        operationType: 'stream',
        promptLength: 11,
      });
      expect(mocks.startAIPerformanceTrace).toHaveBeenCalledWith(
        'streamAIContent',
        'gemini',
      );
      expect(mocks.endTrace).toHaveBeenCalledTimes(1);
    });

    it('deve detectar flashcard e passar o contexto correto', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: true,
        message: undefined,
        retryAfterMs: 0,
        remainingMinute: 9,
        remainingHour: 49,
      });
      mocks.detectAIProvider.mockReturnValue(geminiConfig);

      const callbacks = makeCallbacks();
      await streamAIContent('Crie um flashcard sobre constitucional', callbacks);

      expect(mocks.streamWithGemini).toHaveBeenCalledWith(
        'gemini-key-12345',
        'Crie um flashcard sobre constitucional',
        callbacks,
        'flashcard',
      );
    });
  });

  // ── Test 8: Gemini falha → fallback Groq stream ──
  describe('8. Gemini falha com fallback para Groq stream', () => {
    it('deve chamar streamWithGroq após Gemini falhar', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: true,
        message: undefined,
        retryAfterMs: 0,
        remainingMinute: 9,
        remainingHour: 49,
      });
      mocks.detectAIProvider.mockReturnValue(geminiConfig);
      mocks.streamWithGemini.mockRejectedValue(new Error('Gemini rate limit'));

      const callbacks = makeCallbacks();
      await streamAIContent('test prompt', callbacks, 'gemini-key-12345', 'grook-key-12345');

      expect(mocks.streamWithGemini).toHaveBeenCalled();
      expect(mocks.captureAIError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Gemini rate limit' }),
        'Gemini',
        'stream',
        11,
      );
      // Deve ter chamado onChunk com aviso de fallback
      expect(callbacks.onChunk).toHaveBeenCalledWith(
        expect.stringContaining('Gemini falhou'),
      );
      expect(mocks.streamWithGroq).toHaveBeenCalledWith(
        'grook-key-12345',
        'test prompt',
        callbacks,
      );
      expect(mocks.endTrace).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro quando não há chave Groq para fallback', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: true,
        message: undefined,
        retryAfterMs: 0,
        remainingMinute: 9,
        remainingHour: 49,
      });
      mocks.detectAIProvider.mockReturnValue(geminiConfig);
      mocks.streamWithGemini.mockRejectedValue(new Error('API key invalid'));

      const callbacks = makeCallbacks();
      await streamAIContent('test prompt', callbacks, 'gemini-key-12345');

      // O erro deve ir para onError (capturado pelo catch externo)
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'API key invalid' }),
      );
      expect(mocks.streamWithGroq).not.toHaveBeenCalled();
      expect(mocks.endTrace).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test extra: Groq como provider principal ──
  describe('Groq como provider principal', () => {
    it('deve chamar streamWithGroq quando provider é groq', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: true,
        message: undefined,
        retryAfterMs: 0,
        remainingMinute: 9,
        remainingHour: 49,
      });
      mocks.detectAIProvider.mockReturnValue(groqConfig);

      const callbacks = makeCallbacks();
      await streamAIContent('test prompt', callbacks);

      expect(mocks.streamWithGroq).toHaveBeenCalledWith(
        'groq-key-12345',
        'test prompt',
        callbacks,
      );
      expect(mocks.streamWithGemini).not.toHaveBeenCalled();
    });

    it('deve fazer fallback para Gemini quando Groq falha e geminiKey existe', async () => {
      mocks.checkRateLimit.mockReturnValue({
        allowed: true,
        message: undefined,
        retryAfterMs: 0,
        remainingMinute: 9,
        remainingHour: 49,
      });
      mocks.detectAIProvider.mockReturnValue(groqConfig);
      mocks.streamWithGroq.mockRejectedValue(new Error('Groq API error'));

      const callbacks = makeCallbacks();
      await streamAIContent(
        'test prompt',
        callbacks,
        'gemini-key-12345',
        'grook-key-12345',
        'groq',
      );

      expect(mocks.streamWithGroq).toHaveBeenCalled();
      expect(mocks.captureAIError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Groq API error' }),
        'Groq',
        'stream',
        11,
      );
      expect(callbacks.onChunk).toHaveBeenCalledWith(
        expect.stringContaining('Groq falhou'),
      );
      expect(mocks.streamWithGemini).toHaveBeenCalledWith(
        'gemini-key-12345',
        'test prompt',
        callbacks,
      );
      expect(mocks.endTrace).toHaveBeenCalledTimes(1);
    });
  });
});
