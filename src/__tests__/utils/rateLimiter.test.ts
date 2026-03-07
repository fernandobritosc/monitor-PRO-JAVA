/**
 * Testes para o Rate Limiter
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, resetRateLimit, getRateLimitStats, RateLimitError, withRateLimit } from '../../../utils/rateLimiter';


describe('rateLimiter', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    describe('checkRateLimit', () => {
        it('deve permitir a primeira chamada', () => {
            const result = checkRateLimit('generate');
            expect(result.allowed).toBe(true);
            expect(result.remainingMinute).toBe(9); // 10 - 1
        });

        it('deve decrementar tokens a cada chamada', () => {
            for (let i = 0; i < 5; i++) {
                checkRateLimit('generate');
            }
            const stats = getRateLimitStats('generate');
            expect(stats.remainingMinute).toBe(5); // 10 - 5
        });

        it('deve bloquear após atingir o limite por minuto', () => {
            // Esgota todos os tokens
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            const blockedResult = checkRateLimit('generate');
            expect(blockedResult.allowed).toBe(false);
            expect(blockedResult.message).toBeDefined();
            expect(blockedResult.retryAfterMs).toBeGreaterThan(0);
        });

        it('deve separar limites por tipo de operação', () => {
            // Esgota tokens para 'generate'
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            // 'stream' ainda deve ter tokens
            const streamResult = checkRateLimit('stream');
            expect(streamResult.allowed).toBe(true);
        });

        it('deve recarregar tokens após 1 minuto', () => {
            // Esgota tokens
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            expect(checkRateLimit('generate').allowed).toBe(false);

            // Avança o tempo em 1 minuto
            vi.advanceTimersByTime(60001);

            // Deve permitir novamente
            const result = checkRateLimit('generate');
            expect(result.allowed).toBe(true);
        });

        it('deve retornar mensagem amigável ao bloquear', () => {
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            const result = checkRateLimit('generate');
            expect(result.message).toContain('Limite');
            expect(result.message).toContain('minuto');
        });
    });

    describe('resetRateLimit', () => {
        it('deve resetar os tokens', () => {
            // Esgota tokens
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            expect(checkRateLimit('generate').allowed).toBe(false);

            resetRateLimit('generate');

            expect(checkRateLimit('generate').allowed).toBe(true);
        });
    });

    describe('withRateLimit', () => {
        it('deve executar a função quando permitido', async () => {
            const mockFn = vi.fn().mockResolvedValue('resultado');
            const result = await withRateLimit(mockFn, 'generate');
            expect(mockFn).toHaveBeenCalledOnce();
            expect(result).toBe('resultado');
        });

        it('deve lançar RateLimitError quando bloqueado', async () => {
            // Esgota tokens
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            const mockFn = vi.fn().mockResolvedValue('resultado');

            await expect(withRateLimit(mockFn, 'generate')).rejects.toThrow(RateLimitError);
            expect(mockFn).not.toHaveBeenCalled();
        });

        it('RateLimitError deve ter retryAfterMs', async () => {
            for (let i = 0; i < 10; i++) {
                checkRateLimit('generate');
            }

            try {
                await withRateLimit(() => Promise.resolve(''), 'generate');
            } catch (e) {
                expect(e).toBeInstanceOf(RateLimitError);
                expect((e as RateLimitError).retryAfterMs).toBeGreaterThan(0);
            }
        });
    });

    describe('getRateLimitStats', () => {
        it('deve retornar estatísticas sem consumir tokens', () => {
            const statsBefore = getRateLimitStats('generate');
            const statsAfter = getRateLimitStats('generate');

            expect(statsBefore.remainingMinute).toBe(statsAfter.remainingMinute);
        });

        it('deve rastrear total de chamadas do dia', () => {
            for (let i = 0; i < 3; i++) {
                checkRateLimit('generate');
            }

            const stats = getRateLimitStats('generate');
            expect(stats.totalCallsToday).toBe(3);
        });
    });
});
