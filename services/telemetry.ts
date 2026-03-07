import * as Sentry from "@sentry/react";
import posthog from 'posthog-js';

// ============================================================
// Inicialização
// ============================================================

export const initTelemetry = () => {
    const sentryDsn = (import.meta as any).env.VITE_SENTRY_DSN || "";

    if (sentryDsn) {
        Sentry.init({
            dsn: sentryDsn,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration(),
            ],
            tracesSampleRate: 0.2, // 20% em produção para economizar cota
            replaysSessionSampleRate: 0.05,
            replaysOnErrorSampleRate: 1.0,
            // Filtra erros de rede esperados
            ignoreErrors: [
                'Network request failed',
                'Failed to fetch',
                'Load failed',
            ],
            beforeSend(event) {
                // Remove dados sensíveis antes de enviar
                if (event.request?.data) {
                    const data = event.request.data as any;
                    if (data.apiKey) data.apiKey = '[REDACTED]';
                    if (data.password) data.password = '[REDACTED]';
                }
                return event;
            },
        });
    }

    const posthogKey = (import.meta as any).env.VITE_POSTHOG_KEY || "";
    const posthogHost = (import.meta as any).env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

    if (posthogKey) {
        posthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: 'identified_only',
            capture_pageview: true,
        });
    }
};

// ============================================================
// Identificação de Usuário
// ============================================================

export const identifyUser = (userId: string, email: string) => {
    Sentry.setUser({ id: userId, email });
    posthog.identify(userId, { email });
};

export const clearUserIdentity = () => {
    Sentry.setUser(null);
    posthog.reset();
};

// ============================================================
// Contextos Granulares do Sentry
// ============================================================

/**
 * Define o contexto da operação de IA atual.
 * Chamado antes de qualquer chamada ao aiService.
 */
export const setAIOperationContext = (context: {
    provider: 'gemini' | 'groq';
    model?: string;
    operationType: 'stream' | 'generate' | 'audio' | 'podcast';
    context?: string;
    promptLength?: number;
}) => {
    Sentry.setContext('ai_operation', {
        provider: context.provider,
        model: context.model || 'default',
        operation_type: context.operationType,
        context: context.context || 'general',
        prompt_length: context.promptLength || 0,
        timestamp: new Date().toISOString(),
    });

    Sentry.addBreadcrumb({
        category: 'ai',
        message: `Iniciando chamada de IA: ${context.provider} / ${context.operationType}`,
        level: 'info',
        data: {
            provider: context.provider,
            model: context.model,
            operation: context.operationType,
        },
    });
};

/**
 * Define o contexto do flashcard atual.
 * Chamado ao interagir com um flashcard específico.
 */
export const setFlashcardContext = (context: {
    cardId?: string;
    materia?: string;
    assunto?: string;
    action: 'study' | 'create' | 'edit' | 'delete' | 'ai_explain' | 'ai_mnemonic';
}) => {
    Sentry.setContext('flashcard', {
        card_id: context.cardId || 'unknown',
        materia: context.materia || 'unknown',
        assunto: context.assunto || 'unknown',
        action: context.action,
        timestamp: new Date().toISOString(),
    });

    Sentry.addBreadcrumb({
        category: 'flashcard',
        message: `Flashcard: ${context.action}`,
        level: 'info',
        data: {
            materia: context.materia,
            action: context.action,
        },
    });
};

/**
 * Registra navegação como breadcrumb no Sentry.
 */
export const trackNavigation = (from: string, to: string) => {
    Sentry.addBreadcrumb({
        category: 'navigation',
        message: `${from} → ${to}`,
        level: 'info',
        data: { from, to },
    });

    Sentry.setContext('navigation', {
        current_view: to,
        previous_view: from,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Define contexto da missão ativa do usuário.
 */
export const setMissaoContext = (missaoAtiva: string) => {
    Sentry.setContext('app_state', {
        missao_ativa: missaoAtiva,
    });
};

// ============================================================
// Performance Tracking
// ============================================================

/**
 * Inicia uma transação de performance para operações de IA.
 * Retorna uma função para finalizar a transação.
 */
export const startAIPerformanceTrace = (
    operationName: string,
    provider: string
): (() => void) => {
    const startTime = performance.now();
    const transactionId = `ai_${operationName}_${Date.now()}`;

    Sentry.addBreadcrumb({
        category: 'performance',
        message: `[START] ${operationName} (${provider})`,
        level: 'debug',
        data: { operation: operationName, provider, start_time: startTime },
    });

    return () => {
        const duration = performance.now() - startTime;

        Sentry.addBreadcrumb({
            category: 'performance',
            message: `[END] ${operationName} completou em ${duration.toFixed(0)}ms`,
            level: 'info',
            data: {
                operation: operationName,
                provider,
                duration_ms: Math.round(duration),
            },
        });

        // Registra como medida de performance
        if (typeof performance.measure === 'function') {
            try {
                performance.mark(`${transactionId}_end`);
            } catch {
                // Ignora se performance API não suportar
            }
        }
    };
};

// ============================================================
// Captura de Erros com Contexto
// ============================================================

import { logger } from '../utils/logger';

export const captureError = (error: any, context?: Record<string, any>) => {
    logger.error('DATA', 'Capture Error', { error: error?.message, context });

    Sentry.withScope((scope) => {
        if (context) {
            scope.setContext('error_context', context);
        }

        if (context?.component) scope.setTag('component', context.component);
        if (context?.operation) scope.setTag('operation', context.operation);
        if (context?.provider) scope.setTag('ai_provider', context.provider);

        Sentry.captureException(error);
    });
};

export const captureAIError = (
    error: Error,
    provider: 'Gemini' | 'Groq',
    operation: string,
    promptLength?: number
) => {
    Sentry.withScope((scope) => {
        scope.setTag('error_type', 'ai_api_error');
        scope.setTag('ai_provider', provider.toLowerCase());
        scope.setTag('ai_operation', operation);
        scope.setContext('ai_error', {
            provider,
            operation,
            prompt_length: promptLength || 0,
            error_message: error.message,
        });
        Sentry.captureException(error);
    });
};

// ============================================================
// Eventos PostHog
// ============================================================

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    posthog.capture(eventName, properties);
};

export const trackAIUsage = (data: {
    provider: 'gemini' | 'groq';
    model?: string;
    operation: string;
    duration?: number;
    success: boolean;
    error?: string;
}) => {
    posthog.capture('ai_call', {
        provider: data.provider,
        model: data.model,
        operation: data.operation,
        duration_ms: data.duration,
        success: data.success,
        error_message: data.error,
    });
};
