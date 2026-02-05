
import { GoogleGenAI } from "@google/genai";

/**
 * SERVIÇO DE IA UNIFICADO - GEMINI & GROQ
 * Suporta múltiplos provedores de IA com fallback automático e seleção manual
 */

export type AIProvider = 'gemini' | 'groq';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

export interface AIStreamCallback {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Detecta qual provedor de IA usar baseado nas chaves disponíveis
 */
export const detectAIProvider = (
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProvider
): AIConfig | null => {
  // Se houver preferência explícita e a chave estiver disponível
  if (preferredProvider === 'gemini' && geminiKey && geminiKey.length > 10) {
    return { provider: 'gemini', apiKey: geminiKey };
  }

  if (preferredProvider === 'groq' && groqKey && groqKey.length > 10) {
    return { provider: 'groq', apiKey: groqKey };
  }

  // Fallback automático baseado nas chaves disponíveis
  if (geminiKey && geminiKey.length > 10) {
    return { provider: 'gemini', apiKey: geminiKey };
  }

  if (groqKey && groqKey.length > 10) {
    return { provider: 'groq', apiKey: groqKey };
  }

  return null;
};

/**
 * Streaming com Gemini (via SDK Oficial @google/genai)
 */
const streamWithGemini = async (
  apiKey: string,
  prompt: string,
  callbacks: AIStreamCallback
): Promise<void> => {
  try {
    console.log('🤖 Iniciando streaming com Gemini SDK (gemini-3-flash-preview)...');
    
    // O SDK é carregado via CDN (index.html) ou node_modules
    const ai = new GoogleGenAI({ apiKey });
    
    // ATUALIZADO: Usando gemini-3-flash-preview e aumentando tokens para evitar cortes
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Aumentado de 1000 para 8192
      }
    });

    for await (const chunk of response) {
      if (chunk.text) {
        callbacks.onChunk(chunk.text);
      }
    }

    console.log('✅ Streaming Gemini completo');
    callbacks.onComplete();
  } catch (error: any) {
    console.error('Erro no Gemini:', error);
    const msg = error.message || 'Erro desconhecido na API Gemini';
    
    // Traduzindo erro comum de 404 para mensagem mais amigável
    if (msg.includes('404') || msg.includes('Not Found')) {
        callbacks.onError(new Error(`Erro 404: Modelo 'gemini-3-flash-preview' não encontrado. Verifique sua API Key.`));
    } else {
        callbacks.onError(new Error(`Gemini Error: ${msg}`));
    }
  }
};

/**
 * Streaming com Groq (via REST API)
 */
const streamWithGroq = async (
  apiKey: string,
  prompt: string,
  callbacks: AIStreamCallback
): Promise<void> => {
  try {
    console.log('🚀 Iniciando streaming com Groq...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096, // Aumentado de 1000 para 4096
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Groq API:', errorText);
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from Groq');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                callbacks.onChunk(content);
              }
            } catch (e) {
              console.warn('Failed to parse Groq chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log('✅ Streaming Groq completo');
    callbacks.onComplete();
  } catch (error) {
    console.error('Erro no Groq:', error);
    callbacks.onError(error as Error);
  }
};

/**
 * Função principal de streaming
 */
export const streamAIContent = async (
  prompt: string,
  callbacks: AIStreamCallback,
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProvider
): Promise<void> => {
  console.log('🎯 Stream AI solicitado:', {
    hasGeminiKey: !!geminiKey,
    hasGroqKey: !!groqKey,
    preferredProvider,
    promptLength: prompt.length
  });

  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    const error = new Error('Nenhuma chave de IA configurada. Configure Gemini ou Groq nas configurações.');
    console.error(error.message);
    callbacks.onError(error);
    return;
  }

  console.log(`🤖 Usando provedor: ${config.provider.toUpperCase()}`);

  try {
    if (config.provider === 'gemini') {
      await streamWithGemini(config.apiKey, prompt, callbacks);
    } else {
      await streamWithGroq(config.apiKey, prompt, callbacks);
    }
  } catch (error) {
    console.error('Erro no streamAIContent:', error);
    callbacks.onError(error as Error);
  }
};

/**
 * Geração sem streaming (fallback)
 */
export const generateAIContent = async (
  prompt: string,
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProvider
): Promise<string> => {
  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    throw new Error('Nenhuma chave de IA configurada');
  }

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Aumentado para 8192
      }
    });
    return response.text || '';
  } else {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096, // Aumentado para 4096
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};
