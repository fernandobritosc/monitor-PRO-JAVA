/**
 * Rate Limiter para chamadas de IA
 * Implementa o algoritmo Token Bucket com persistência em localStorage
 *
 * Limites padrão:
 * - 10 chamadas por minuto por tipo de operação
 * - 50 chamadas por hora no total
 */

interface RateLimitConfig {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    storageKey: string;
}

interface RateLimitState {
    minuteTokens: number;
    hourTokens: number;
    lastMinuteRefill: number;
    lastHourRefill: number;
    totalCallsToday: number;
}

interface RateLimitResult {
    allowed: boolean;
    remainingMinute: number;
    remainingHour: number;
    retryAfterMs: number;
    message?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 50,
    storageKey: 'monitorpro_rate_limit',
};

const getState = (storageKey: string): RateLimitState => {
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignora erros de parse
    }

    const now = Date.now();
    return {
        minuteTokens: DEFAULT_CONFIG.maxRequestsPerMinute,
        hourTokens: DEFAULT_CONFIG.maxRequestsPerHour,
        lastMinuteRefill: now,
        lastHourRefill: now,
        totalCallsToday: 0,
    };
};

const saveState = (storageKey: string, state: RateLimitState): void => {
    try {
        localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
        // Ignora erros de storage
    }
};

const refillTokens = (state: RateLimitState, config: RateLimitConfig): RateLimitState => {
    const now = Date.now();
    let updated = { ...state };

    // Refil por minuto
    const minutesPassed = Math.floor((now - state.lastMinuteRefill) / 60000);
    if (minutesPassed > 0) {
        updated.minuteTokens = Math.min(
            config.maxRequestsPerMinute,
            updated.minuteTokens + minutesPassed * config.maxRequestsPerMinute
        );
        updated.lastMinuteRefill = now;
    }

    // Refil por hora
    const hoursPassed = Math.floor((now - state.lastHourRefill) / 3600000);
    if (hoursPassed > 0) {
        updated.hourTokens = Math.min(
            config.maxRequestsPerHour,
            updated.hourTokens + hoursPassed * config.maxRequestsPerHour
        );
        updated.lastHourRefill = now;
        if (hoursPassed >= 24) {
            updated.totalCallsToday = 0; // Reset diário
        }
    }

    return updated;
};

/**
 * Verifica se uma chamada de IA pode ser realizada.
 * Consome um token se permitido.
 */
export const checkRateLimit = (
    operationType: 'stream' | 'generate' | 'audio' = 'generate',
    config: Partial<RateLimitConfig> = {}
): RateLimitResult => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const storageKey = `${finalConfig.storageKey}_${operationType}`;

    let state = getState(storageKey);
    state = refillTokens(state, finalConfig);

    const minuteAvailable = state.minuteTokens > 0;
    const hourAvailable = state.hourTokens > 0;
    const allowed = minuteAvailable && hourAvailable;

    if (allowed) {
        // Consome tokens
        state.minuteTokens -= 1;
        state.hourTokens -= 1;
        state.totalCallsToday += 1;
        saveState(storageKey, state);
    }

    // Calcula tempo de espera
    const now = Date.now();
    let retryAfterMs = 0;
    if (!minuteAvailable) {
        retryAfterMs = 60000 - (now - state.lastMinuteRefill);
    } else if (!hourAvailable) {
        retryAfterMs = 3600000 - (now - state.lastHourRefill);
    }

    let message: string | undefined;
    if (!minuteAvailable) {
        const seconds = Math.ceil(retryAfterMs / 1000);
        message = `Limite de ${finalConfig.maxRequestsPerMinute} chamadas por minuto atingido. Aguarde ${seconds}s.`;
    } else if (!hourAvailable) {
        const minutes = Math.ceil(retryAfterMs / 60000);
        message = `Limite de ${finalConfig.maxRequestsPerHour} chamadas por hora atingido. Aguarde ${minutes}min.`;
    }

    return {
        allowed,
        remainingMinute: Math.max(0, state.minuteTokens),
        remainingHour: Math.max(0, state.hourTokens),
        retryAfterMs: Math.max(0, retryAfterMs),
        message,
    };
};

/**
 * Reseta o rate limit para um tipo de operação.
 * Útil para testes e situações de emergência.
 */
export const resetRateLimit = (
    operationType: 'stream' | 'generate' | 'audio' = 'generate'
): void => {
    const storageKey = `${DEFAULT_CONFIG.storageKey}_${operationType}`;
    localStorage.removeItem(storageKey);
};

/**
 * Retorna estatísticas de uso atual sem consumir tokens.
 */
export const getRateLimitStats = (
    operationType: 'stream' | 'generate' | 'audio' = 'generate'
): Omit<RateLimitResult, 'allowed' | 'message'> & { totalCallsToday: number } => {
    const storageKey = `${DEFAULT_CONFIG.storageKey}_${operationType}`;
    const state = refillTokens(getState(storageKey), DEFAULT_CONFIG);

    return {
        remainingMinute: state.minuteTokens,
        remainingHour: state.hourTokens,
        retryAfterMs: 0,
        totalCallsToday: state.totalCallsToday,
    };
};

/**
 * HOF: Envolve uma função async com verificação de rate limit.
 * Lança RateLimitError se o limite for atingido.
 */
export class RateLimitError extends Error {
    constructor(
        message: string,
        public readonly retryAfterMs: number
    ) {
        super(message);
        this.name = 'RateLimitError';
    }
}

export const withRateLimit = <T>(
    fn: () => Promise<T>,
    operationType: 'stream' | 'generate' | 'audio' = 'generate'
): Promise<T> => {
    const result = checkRateLimit(operationType);

    if (!result.allowed) {
        return Promise.reject(
            new RateLimitError(
                result.message || 'Rate limit atingido',
                result.retryAfterMs
            )
        );
    }

    return fn();
};
