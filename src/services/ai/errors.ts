import { logger } from '../../utils/logger';

export const processAIError = (error: any, provider: 'Gemini' | 'Groq'): Error => {
  logger.error('AI', `Erro no ${provider}`, { error: error?.message });
  let friendlyMessage = error.message || `Erro desconhecido na API ${provider}`;

  if (typeof friendlyMessage === 'string') {
    if (provider === 'Gemini' && (friendlyMessage.includes('API key expired') || friendlyMessage.includes('API_KEY_INVALID'))) {
      friendlyMessage = `Sua chave de API do Gemini expirou ou é inválida. Por favor, vá em Configurar > Sistema & API para atualizar sua chave.`;
    }
    if (provider === 'Groq' && friendlyMessage.includes('invalid_api_key')) {
      friendlyMessage = `Sua chave de API do Groq é inválida. Por favor, vá em Configurar > Sistema & API para atualizar sua chave.`;
    }
  }

  return new Error(`${provider} Error: ${friendlyMessage}`);
};
