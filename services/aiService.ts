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

// --- ÁUDIO / TTS (Podcast Style) ---

// Helpers de Áudio (Base64 -> AudioBuffer)
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normaliza PCM 16-bit para Float32 (-1.0 a 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Gera áudio neural (TTS) usando Gemini 2.5 Flash
 * Retorna uma função para parar o áudio se necessário.
 */
export const speakTextWithGemini = async (
  text: string,
  apiKey: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (err: string) => void
): Promise<() => void> => {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;

  try {
    console.log('🎙️ Solicitando TTS ao Gemini...');
    
    // Limita texto muito longo para evitar erro de cota ou timeout
    const safeText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;

    const ai = new GoogleGenAI({ apiKey });
    
    // Chamada correta para o modelo TTS
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { 
        parts: [{ text: safeText }] 
      },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Voz 'Kore' é boa para podcast/explicação
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Nenhum áudio retornado pelo modelo.");
    }

    // Inicializa Audio Context
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Decodifica PCM (Gemini retorna PCM raw, não mp3/wav)
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);

    // Toca o áudio
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      onEnd();
      audioContext?.close();
    };

    onStart();
    source.start();

    // Retorna função de cancelamento
    return () => {
      if (source) source.stop();
      if (audioContext) audioContext.close();
    };

  } catch (error: any) {
    console.error('Erro TTS:', error);
    let msg = error.message;
    if (msg.includes('404')) msg = "Modelo de voz indisponível na sua região ou chave API.";
    if (msg.includes('API key')) msg = "Chave API do Gemini inválida ou não configurada.";
    onError(msg);
    onEnd();
    return () => {};
  }
};

/**
 * NOVO: Gera um PODCAST (Diálogo entre duas pessoas)
 * 1. Usa IA de Texto para converter a explicação em roteiro.
 * 2. Usa IA de Áudio (Multi-Speaker) para gerar o som.
 */
export const generatePodcastAudio = async (
  originalText: string,
  apiKey: string,
  onStatusChange: (status: string) => void,
  onStartAudio: () => void,
  onEndAudio: () => void,
  onError: (err: string) => void
): Promise<() => void> => {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // PASSO 1: Gerar o Roteiro
    onStatusChange("Escrevendo roteiro...");
    const scriptPrompt = `
      Converta o seguinte texto explicativo em um diálogo de podcast curto, dinâmico e educacional entre dois apresentadores (Alex e Bia).
      O tom deve ser natural, entusiasta e fácil de entender.
      
      IMPORTANTE: Use estritamente o formato:
      Alex: [fala]
      Bia: [fala]
      
      Texto Original:
      "${originalText.substring(0, 3000)}"
    `;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: scriptPrompt,
    });

    const scriptText = scriptResponse.text;
    if (!scriptText) throw new Error("Falha ao gerar roteiro.");

    console.log("Roteiro Gerado:", scriptText);

    // PASSO 2: Gerar Áudio Multi-Speaker
    onStatusChange("Gravando episódio...");
    
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: scriptText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                    {
                        speaker: 'Alex',
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Voz Masculina Profunda
                        }
                    },
                    {
                        speaker: 'Bia',
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Kore' } // Voz Feminina Calma
                        }
                    }
              ]
            }
        }
      }
    });

    const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Falha na geração do áudio do podcast.");
    }

    onStatusChange("Reproduzindo...");

    // Inicializa Audio Context
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);

    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      onEndAudio();
      audioContext?.close();
    };

    onStartAudio();
    source.start();

    return () => {
      if (source) source.stop();
      if (audioContext) audioContext.close();
    };

  } catch (error: any) {
    console.error('Erro Podcast:', error);
    onError(error.message);
    onEndAudio();
    return () => {};
  }
};