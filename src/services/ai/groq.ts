import { AIStreamCallback } from './types';
import { GROQ_FLASHCARD_SYSTEM_PROMPT, GROQ_GENERAL_SYSTEM_PROMPT } from './prompts';
import { processAIError } from './errors';
import { logger } from '../../utils/logger';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const streamWithGroq = async (
  apiKey: string,
  prompt: string,
  callbacks: AIStreamCallback
): Promise<void> => {
  try {
    logger.info('AI', 'Iniciando streaming com Groq');

    const isFlashcard = prompt.toLowerCase().includes('pergunta:') || prompt.toLowerCase().includes('resposta:');
    const systemPrompt = isFlashcard ? GROQ_FLASHCARD_SYSTEM_PROMPT : GROQ_GENERAL_SYSTEM_PROMPT;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise o seguinte conteúdo:\n\n${prompt}` }
        ],
        temperature: 0.5,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
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
              logger.warn('AI', 'Failed to parse Groq chunk', { error: e });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    logger.info('AI', 'Streaming Groq completo');
    callbacks.onComplete();
  } catch (error: unknown) {
    callbacks.onError(processAIError(error, 'Groq'));
  }
};

export const runGroq = async (
  apiKey: string,
  finalPrompt: string
): Promise<string> => {
  try {
    const systemPrompt = `Você é um especialista sênior em concursos públicos.`;
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalPrompt }
        ],
        temperature: 0.5,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) throw new Error(`Groq status ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: unknown) {
    throw processAIError(error, 'Groq');
  }
};
