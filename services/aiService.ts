import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "./supabase";

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
    console.log('🤖 Iniciando streaming com Gemini SDK (gemini-2.0-flash-exp)...');
    
    const ai = new GoogleGenAI({ apiKey });

    // PROMPT OTIMIZADO PARA GEMINI: Direto, conciso e focado em mnemônicos.
    const fullPrompt = `Você é um tutor de concursos. Explique o conceito, dê um exemplo, e crie um mnemônico para o flashcard a seguir:\n\n${prompt}`;
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-exp', 
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
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
    callbacks.onError(new Error(`Gemini Error: ${msg}`));
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

    // PROMPT OTIMIZADO PARA GROQ (formato OpenAI): System message detalhado.
    const systemPrompt = `Você é um professor universitário especialista em concursos públicos, conhecido por sua didática e profundidade. Sua resposta DEVE ser estruturada em Markdown com os seguintes tópicos:
- **# Explicação Detalhada:** Elabore o conceito com profundidade, conectando com outros temas relevantes.
- **# Exemplo Prático:** Forneça um exemplo claro e contextualizado de aplicação.
- **# Analogia:** Crie uma analogia para simplificar o entendimento.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise o seguinte flashcard:\n\n${prompt}` }
        ],
        temperature: 0.5,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Groq API:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
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
  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    const error = new Error('Nenhuma chave de IA configurada. Configure Gemini ou Groq nas configurações.');
    callbacks.onError(error);
    return;
  }

  try {
    if (config.provider === 'gemini') {
      await streamWithGemini(config.apiKey, prompt, callbacks);
    } else {
      await streamWithGroq(config.apiKey, prompt, callbacks);
    }
  } catch (error) {
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
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    });
    return response.text;
  } else {
    // Groq
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
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};

// ============ FUNÇÕES DE ÁUDIO - TTS COM GEMINI ============

function decodeBase64(base64: string): Uint8Array {
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
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createWavFile(samples: Int16Array, sampleRate: number = 24000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i], true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export const handlePlayRevisionAudio = async (
  text: string,
  revisionId: string,
  apiKey: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (err: string) => void
): Promise<() => void> => {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let htmlAudio: HTMLAudioElement | null = null;

  try {
    const fileName = `${revisionId}.wav`; 
    const bucketName = 'audio-revisions';

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    let cacheExists = false;
    try {
      const { data: listData } = await supabase.storage.from(bucketName).list('', { search: fileName });
      if (listData && listData.length > 0) cacheExists = true;
    } catch (e) { console.warn("Falha ao verificar cache de áudio:", e); }

    if (cacheExists) {
      console.log("🔊 Áudio encontrado no cache.");
      htmlAudio = new Audio(publicUrl);
      htmlAudio.onended = () => onEnd();
      htmlAudio.onerror = (e) => onError("Erro ao reproduzir arquivo do cache.");
      onStart();
      htmlAudio.play().catch(e => onError("Autoplay bloqueado ou erro de reprodução: " + (e as Error).message));
      return () => { if (htmlAudio) { htmlAudio.pause(); htmlAudio.currentTime = 0; } };
    }

    console.log("🎙️ Áudio não cacheado. Gerando com Gemini...");
    const safeText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: { parts: [{ text: safeText }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Nenhum áudio gerado.");

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBytes = decodeBase64(base64Audio); 
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);

    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => { onEnd(); audioContext?.close(); };
    onStart();
    source.start();

    (async () => {
      try {
        const int16Data = new Int16Array(audioBytes.buffer);
        const wavBlob = createWavFile(int16Data, 24000);
        await supabase.storage.from(bucketName).upload(fileName, wavBlob, { contentType: 'audio/wav', upsert: true });
        console.log("💾 Áudio salvo em cache com sucesso!");
      } catch (bgError) { console.error("Falha no upload de background:", bgError); }
    })();

    return () => { if (source) source.stop(); if (audioContext) audioContext.close(); };
  } catch (error: any) {
    onError(error.message);
    onEnd();
    return () => {};
  }
};

export const deleteCachedAudio = async (revisionId: string) => {
  const fileNames = [`${revisionId}.wav`, `${revisionId}_podcast.wav`];
  const bucketName = 'audio-revisions';
  try {
    const { error } = await supabase.storage.from(bucketName).remove(fileNames);
    if (error) console.warn('Erro ao deletar áudio antigo:', error);
    else console.log('🗑️ Cache de áudio limpo para:', revisionId);
  } catch (e) { console.error('Falha ao limpar cache:', e); }
};

export const generatePodcastAudio = async (
  originalText: string,
  referenceId: string,
  apiKey: string,
  onStatusChange: (status: string) => void,
  onStartAudio: () => void,
  onEndAudio: () => void,
  onError: (err: string) => void
): Promise<() => void> => {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let htmlAudio: HTMLAudioElement | null = null;

  try {
    const fileName = `${referenceId}_podcast.wav`;
    const bucketName = 'audio-revisions';
    
    onStatusChange("Buscando cache...");
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    let cacheExists = false;
    try {
      const { data: listData } = await supabase.storage.from(bucketName).list('', { search: fileName });
      if (listData && listData.length > 0) cacheExists = true;
    } catch (e) { console.warn("Erro verificação cache podcast:", e); }

    if (cacheExists) {
        console.log("🎙️ Podcast encontrado no cache!");
        onStatusChange("Carregando...");
        htmlAudio = new Audio(publicUrl);
        htmlAudio.onended = () => onEndAudio();
        htmlAudio.onerror = (e) => onError("Erro ao tocar cache.");
        onStartAudio();
        htmlAudio.play().catch(e => onError("Autoplay bloqueado: " + (e as Error).message));
        return () => { if (htmlAudio) { htmlAudio.pause(); htmlAudio.currentTime = 0; } };
    }

    const ai = new GoogleGenAI({ apiKey });
    onStatusChange("Escrevendo roteiro...");
    const scriptPrompt = `Converta o seguinte texto em um diálogo de podcast curto entre Alex e Bia. Formato estrito: Alex: [fala] Bia: [fala]. Texto: "${originalText.substring(0, 3000)}"`;
    const scriptResponse = await ai.models.generateContent({ model: 'gemini-2.0-flash-exp', contents: scriptPrompt });
    const scriptText = scriptResponse.text;
    if (!scriptText) throw new Error("Falha ao gerar roteiro.");
    
    onStatusChange("Gravando episódio...");
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ parts: [{ text: scriptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                    { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                    { speaker: 'Bia', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
              ]
            }
        }
      }
    });

    const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Falha na geração do áudio do podcast.");

    onStatusChange("Reproduzindo...");
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => { onEndAudio(); audioContext?.close(); };
    onStartAudio();
    source.start();

    (async () => {
      try {
        const int16Data = new Int16Array(audioBytes.buffer);
        const wavBlob = createWavFile(int16Data, 24000);
        await supabase.storage.from(bucketName).upload(fileName, wavBlob, { contentType: 'audio/wav', upsert: true });
        console.log("💾 Podcast salvo!");
      } catch (bgError) { console.error("Falha background podcast:", bgError); }
    })();

    return () => { if (source) source.stop(); if (audioContext) audioContext.close(); };
  } catch (error: any) {
    onError(error.message);
    onEndAudio();
    return () => {};
  }
};