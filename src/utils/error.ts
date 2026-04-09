
/**
 * Utilitário para extração segura de mensagens de erro em blocos catch().
 * Segue o padrão 'unknown' do TypeScript Strict.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    
    // Tratamento específico para erros comuns de API (Supabase/Postgrest)
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as any).message);
    }
    
    return "Ocorreu um erro inesperado";
}
