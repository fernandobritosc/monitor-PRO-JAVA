export type AIProviderName = 'gemini' | 'groq';

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string;
}

export interface AIStreamCallback {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export type AIContext =
  | 'flashcard'
  | 'general'
  | 'mapa'
  | 'tabela'
  | 'fluxo'
  | 'info'
  | 'analise_erros'
  | 'macro_diagnostico'
  | 'explicar_erro'
  | 'chat_error_vault';
