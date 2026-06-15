
import * as Sentry from '@sentry/react';
import { logger } from './logger';

/**
 * Utilitário para extração segura de mensagens de erro em blocos catch().
 * Segue o padrão 'unknown' do TypeScript Strict.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    
    // Tratamento específico para erros comuns de API (Supabase/Postgrest)
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    
    return "Ocorreu um erro inesperado";
}

/**
 * Utilitário centralizado de logging de erros.
 * Substitui console.error avulsos e integra com o Sentry automaticamente.
 */
export function logError(context: string, error: unknown, extras?: Record<string, unknown>) {
    // Sempre faz o log no console para desenvolvedores (ambiente local)
    logger.error('SYNC', `[${context}] Erro:`, { error, extras });

    // Envia o erro para o Sentry de forma estruturada para monitoramento real
    Sentry.withScope((scope) => {
        scope.setTag('error_context', context);
        if (extras) {
            scope.setExtras(extras);
        }
        
        if (error instanceof Error) {
            Sentry.captureException(error);
        } else {
            // Se não for uma instância de Error (ex: throw "String"), converte e envia
            Sentry.captureMessage(`[${context}] ${getErrorMessage(error)}`, 'error');
        }
    });
}
