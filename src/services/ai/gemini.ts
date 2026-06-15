import { GoogleGenAI } from "@google/genai";
import { AIStreamCallback, AIContext } from './types';
import { FLASHCARD_PROMPT, GENERAL_PROMPT, MAPA_PROMPT, FLUXO_PROMPT, TABELA_PROMPT, INFO_PROMPT } from './prompts';
import { processAIError } from './errors';
import { logger } from '../../utils/logger';

const GEMINI_STREAM_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'];
const GEMINI_GENERATE_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'];

export const getStreamPrompt = (prompt: string, context: AIContext): string => {
  if (context === 'flashcard') {
    return FLASHCARD_PROMPT + `\n\nConteúdo: ${prompt}`;
  }
  return `${GENERAL_PROMPT}\n\nConteúdo: ${prompt}`;
};

export const getGeneratePrompt = (contentToAnalyze: string, context: AIContext): string => {
  switch (context) {
    case 'flashcard':
      return `Atue como um Especialista em Memorização para Concursos de Elite. 
    Analise o Flashcard:
    ${contentToAnalyze}
    
    ESTRUTURA OBRIGATÓRIA:
    # EXPLICAÇÃO DIRETA
    [Conteúdo técnico e didático]
    
    # APLICAÇÃO EM PROVA
    [Cenário de pegadinhas]
    
    # MNEMÔNICO MUSICAL
    [FOCO TOTAL em Rimas, Ritmos Musicais ou Frases de impacto que "grudem". Fuja do óbvio.]
    
    REGRAS: 1. Sem negrito (**). 2. Tom dinâmico.`;
    case 'mapa':
      return `${MAPA_PROMPT.replace('[CONTEÚDO]', contentToAnalyze)}`;
    case 'fluxo':
      return `${FLUXO_PROMPT.replace('[CONTEÚDO]', contentToAnalyze)}`;
    case 'tabela':
      return `${TABELA_PROMPT.replace('[CONTEÚDO]', contentToAnalyze)}`;
    case 'info':
      return `${INFO_PROMPT.replace('[CONTEÚDO]', contentToAnalyze)}`;
    default:
      return `${GENERAL_PROMPT}\n\nConteúdo: ${contentToAnalyze}`;
  }
};

export const streamWithGemini = async (
  apiKey: string,
  prompt: string,
  callbacks: AIStreamCallback,
  context: AIContext = 'general'
): Promise<void> => {
  let lastError: any = null;
  const finalPrompt = getStreamPrompt(prompt, context);

  for (const modelId of GEMINI_STREAM_MODELS) {
    try {
      logger.info('AI', `Tentando streaming Gemini SDK (${modelId}) para ${context}`);
      const ai = new GoogleGenAI({ apiKey });

      const result = await ai.models.generateContentStream({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      });

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          callbacks.onChunk(text);
        }
      }

      logger.info('AI', `Streaming Gemini (${modelId}) completo`);
      callbacks.onComplete();
      return;
    } catch (error: any) {
      lastError = error;
      logger.warn('AI', `Falha no modelo ${modelId}: ${error.message}`);
      if (error.message?.includes('API_KEY') || error.message?.includes('quota')) break;
    }
  }

  callbacks.onError(processAIError(lastError, 'Gemini'));
};

export const runGemini = async (
  apiKey: string,
  finalPrompt: string
): Promise<string> => {
  let lastError: any = null;

  for (const modelId of GEMINI_GENERATE_MODELS) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      }) as any;

      let resultText = "";
      try {
        if (typeof response.text === 'function') {
          resultText = response.text();
        } else if (response.response && typeof response.response.text === 'function') {
          resultText = response.response.text();
        } else if (typeof response.text === 'string') {
          resultText = response.text;
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          resultText = response.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        logger.warn('AI', 'Falha na extração refinada do texto Gemini', { error: e });
      }

      return resultText || '';
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API_KEY')) break;
    }
  }
  throw processAIError(lastError, 'Gemini');
};
