import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "./supabase";
import { checkRateLimit, RateLimitError } from '../utils/rateLimiter';
import { setAIOperationContext, captureAIError, startAIPerformanceTrace } from './telemetry';
import { logger } from '../utils/logger';

/**
 * SERVIÇO DE IA UNIFICADO - GEMINI & GROQ
 * Suporta múltiplos provedores de IA com fallback automático e seleção manual
 */

export type AIProviderName = 'gemini' | 'groq';

interface AIConfig {
  provider: AIProviderName;
  apiKey: string;
}

export interface AIStreamCallback {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Processa erros de API de IA e retorna uma mensagem amigável.
 */
const processAIError = (error: any, provider: 'Gemini' | 'Groq'): Error => {
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

/**
 * Detecta qual provedor de IA usar baseado nas chaves disponíveis
 */
export const detectAIProvider = (
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProviderName
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
  callbacks: AIStreamCallback,
  context: 'flashcard' | 'general' | 'mapa' | 'tabela' | 'fluxo' | 'info' | 'analise_erros' = 'general'
): Promise<void> => {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'];
  let lastError: any = null;

  // Prompts sincronizados com o snippet do usuário
  const flashcardPrompt = `Atue como um Especialista em Memorização. Forneça uma explicação técnica concisa, um exemplo prático curto e um mnemônico/música extremamente eficaz para o seguinte conteúdo:\n\n${prompt}.\n\nREGRAS CRÍTICAS:\n1. Mantenha o texto limpo, SEM usar negrito (**).\n2. PROIBIDAS saudações (Ex: "Ok", "Vamos lá", "Espero que ajude").\n3. Responda diretamente com o conteúdo técnico.`;
  const generalPrompt = `Atue como um Especialista Sênior em Concursos Públicos. Sua resposta deve ser estritamente técnica, direta e estruturada em Markdown com os seguintes tópicos:\n# EXPLICAÇÃO DETALHADA\n[Conteúdo técnico aqui]\n\n# EXEMPLO PRÁTICO APROFUNDADO\n[Cenário real aqui]\n\nREGRAS VISUAIS E DE TOM:\n1. PROIBIDO o uso de negrito (**).\n2. PROIBIDAS saudações, introduções ou conclusões (Ex: "Aqui está", "Olá", "Espero que isso ajude").\n3. Use apenas cabeçalhos (#) e listas simples (-).\n4. Tom clínico, seco e puramente técnico.`;
  const finalPrompt = context === 'flashcard' ? flashcardPrompt : `${generalPrompt}\n\nConteúdo: ${prompt}`;

  for (const modelId of models) {
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
      // Se for erro de autenticação ou cota, não adianta trocar modelo
      if (error.message?.includes('API_KEY') || error.message?.includes('quota')) break;
    }
  }

  callbacks.onError(processAIError(lastError, 'Gemini'));
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
    logger.info('AI', 'Iniciando streaming com Groq');

    const systemPrompt = `Atue como um Especialista Sênior em Concursos Públicos. Sua comunicação deve ser técnica, profissional e direta.\nESTRUTURA OBRIGATÓRIA:\n# EXPLICAÇÃO DETALHADA\n[Conteúdo]\n\n# EXEMPLO PRÁTICO APROFUNDADO\n[Cenário]\n\nREGRAS CRÍTICAS:\n1. PROIBIDO o uso de asteriscos para negrito (**).\n2. PROIBIDAS saudações, "ok", introduções ou conclusões (Ex: "Espero que ajude", "Vamos lá").\n3. Use apenas títulos (#) para separar seções.\n4. Texto puramente técnico e clínico.`;

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
          { role: 'user', content: `Analise o seguinte conteúdo:\n\n${prompt}` }
        ],
        temperature: 0.5,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
  } catch (error: any) {
    callbacks.onError(processAIError(error, 'Groq'));
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
  preferredProvider?: AIProviderName
): Promise<void> => {
  // Rate Limiting: verifica antes de fazer qualquer chamada
  const rateLimit = checkRateLimit('stream');
  if (!rateLimit.allowed) {
    callbacks.onError(new RateLimitError(
      rateLimit.message || 'Muitas chamadas de IA. Aguarde alguns segundos.',
      rateLimit.retryAfterMs
    ));
    return;
  }

  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    const error = new Error('Nenhuma chave de IA configurada. Configure Gemini ou Groq nas configurações.');
    callbacks.onError(error);
    return;
  }

  // Sentry: contexto da operação de IA
  setAIOperationContext({
    provider: config.provider,
    operationType: 'stream',
    promptLength: prompt.length,
  });

  const endTrace = startAIPerformanceTrace('streamAIContent', config.provider);

  try {
    if (config.provider === 'gemini') {
      try {
        const isFlashcard = prompt.toLowerCase().includes('flashcard') || prompt.toLowerCase().includes('mnemônico');
        await streamWithGemini(config.apiKey, prompt, callbacks, isFlashcard ? 'flashcard' : 'general');
      } catch (err: any) {
        logger.error('AI', 'Falha crítica no Gemini', { error: (err as any)?.message });
        captureAIError(err, 'Gemini', 'stream', prompt.length);
        // Fallback para Groq se Gemini falhar
        if (groqKey && groqKey.length > 10) {
          callbacks.onChunk(`\n\n🔄 [Aviso: Gemini falhou (${err.message}). Ativando Groq automaticamente...]\n\n`);
          await streamWithGroq(groqKey, prompt, callbacks);
        } else {
          throw err;
        }
      }
    } else {
      try {
        await streamWithGroq(config.apiKey, prompt, callbacks);
      } catch (err: any) {
        captureAIError(err, 'Groq', 'stream', prompt.length);
        // Fallback para Gemini se Groq falhar
        if (geminiKey && geminiKey.length > 10) {
          callbacks.onChunk("\n\n🔄 [Aviso: Groq falhou. Ativando Gemini automaticamente...]\n\n");
          await streamWithGemini(geminiKey, prompt, callbacks);
        } else {
          throw err;
        }
      }
    }
  } catch (error) {
    callbacks.onError(error as Error);
  } finally {
    endTrace();
  }
};

/**
 * Utilitário para Parsear JSON da IA de forma robusta
 */
export const parseAIJSON = <T>(jsonString: string): T => {
  try {
    // 1. Extração robusta: Localiza o primeiro '[' ou '{' e o último ']' ou '}'
    const startIdx = Math.min(
      jsonString.indexOf('[') !== -1 ? jsonString.indexOf('[') : Infinity,
      jsonString.indexOf('{') !== -1 ? jsonString.indexOf('{') : Infinity
    );
    const endIdx = Math.max(
      jsonString.lastIndexOf(']'),
      jsonString.lastIndexOf('}')
    );

    if (startIdx === Infinity || endIdx === -1 || endIdx < startIdx) {
      throw new Error("Nenhum bloco JSON encontrado na resposta da IA.");
    }

    let cleaned = jsonString.substring(startIdx, endIdx + 1).trim();

    // 2. Remove Markdown fences residuais se houver (por segurança)
    cleaned = cleaned.replace(/```(json)?/g, '').replace(/```/g, '').trim();

    // 3. Tenta parse direto
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      logger.warn('AI', 'JSON Parse inicial falhou, tentando reparo...');
    }

    // 4. Corrige caracteres de controle e escapes inválidos
    cleaned = cleaned.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "");
    cleaned = cleaned.replace(/(?<!\\)\\(?![\\/"bfnrtu])/g, "\\\\");

    // 5. Reparo de JSON Truncado (Auto-close)
    const closeTruncatedJson = (str: string): string => {
      const stack: ("{" | "[")[] = [];
      let inString = false;
      let i = 0;

      while (i < str.length) {
        const char = str[i];
        if (char === '"' && str[i - 1] !== '\\') {
          inString = !inString;
        } else if (!inString) {
          if (char === '{') stack.push('{');
          else if (char === '[') stack.push('[');
          else if (char === '}') stack.pop();
          else if (char === ']') stack.pop();
        }
        i++;
      }

      let result = str;
      if (inString) result += '"'; // Fecha string aberta

      const reversedStack = [...stack].reverse();
      for (const open of reversedStack) {
        if (open === '{') result += '}';
        else if (open === '[') result += ']';
      }
      return result;
    };

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const recovered = closeTruncatedJson(cleaned);
      try {
        return JSON.parse(recovered);
      } catch (e2) {
        // Se ainda falhar, tenta remover o último elemento incompleto se for array
        if (recovered.startsWith('[')) {
          const lastComma = recovered.lastIndexOf(',');
          if (lastComma > 0) {
            const cut = recovered.substring(0, lastComma) + ']';
            try { return JSON.parse(cut); } catch (e3) { /* segue para erro final */ }
          }
        }
      }
    }

    throw new Error("JSON irrecuperável");
  } catch (error) {
    logger.error('AI', 'Falha crítica no parse do JSON da IA', { error, jsonString: jsonString.substring(0, 200) });
    throw new Error("Resposta da IA incompleta ou inválida. Tente novamente com menos texto ou limpe o campo.");
  }
};

/**
 * Geração sem streaming (fallback)
 */
export const generateAIContent = async (
  prompt: string | { content: string; stats?: any },
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProviderName,
  context: 'flashcard' | 'general' | 'mapa' | 'tabela' | 'fluxo' | 'info' | 'analise_erros' | 'macro_diagnostico' = 'general'
): Promise<string> => {
  const contentToAnalyze = typeof prompt === 'string' ? prompt : prompt.content;
  const statsToAnalyze = typeof prompt === 'string' ? {} : (prompt.stats || {});
  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    throw new Error('Nenhuma chave de IA configurada');
  }

  // Define o finalPrompt for all providers
  let finalPrompt = "";
  if (context === 'flashcard') {
    finalPrompt = `Você é um tutor de concursos. Explique o conceito, dê um exemplo, e crie um mnemônico/música curta para o flashcard a seguir:\n\n${contentToAnalyze}`;
  } else if (context === 'mapa') {
    finalPrompt = `Atue como um Arquiteto de Informação Pedagógica. Crie um MAPA MENTAL ESTRUTURADO sobre: ${contentToAnalyze}.
    Sintaxe Markdown estrita:
    # [TÍTULO CENTRAL]
    ## [RAMO PRINCIPAL]
    ### [SUB-TÓPICO]
    - [DETALHE TÉCNICO]
    
    Regras:
    1. Máximo 4 níveis.
    2. Termos técnicos, curtos e precisos.
    3. PROIBIDO usar negrito (**).
    4. Sem introduções ou explicações fora da estrutura.`;
  } else if (context === 'fluxo') {
    finalPrompt = `Atue como um Engenheiro de Processos Jurídicos. Gere um FLUXOGRAMA LÓGICO VERTICAL para: ${contentToAnalyze}.
    Formato obrigatório por etapa:
    [INÍCIO] -> Introdução técnica.
    [AÇÃO] -> Procedimento.
    [DECISÃO] -> Ponto de controle.
    [RESULTADO] -> Consequência.
    [FIM] -> Conclusão.
    
    Regras de ouro: Lógica de causa e efeito pura, sem verbosidade.`;
  } else if (context === 'tabela') {
    finalPrompt = `Atue como um Mestre em Síntese Estratégica. Crie uma TABELA COMPARATIVA técnica sobre: ${contentToAnalyze}.
    REGRAS ESTREITAS:
    1. APENAS a tabela Markdown. PROIBIDO qualquer texto extra.
    2. 3 colunas padrão: | Critério | Conceito Principal | Comparativo/Oposto |
    3. 4 a 6 linhas de alta densidade técnica.
    4. PROIBIDO o uso de negrito (**). Use apenas texto simples dentro da tabela.`;
  } else if (context === 'info') {
    finalPrompt = `Atue como um Especialista em Resumo Estratégico. Crie uma "Cheat Sheet" técnica sobre: ${contentToAnalyze}. 
    Use emojis de forma cirúrgica, TÍTULOS EM MAIÚSCULAS e Bullet Points. 
    Estrutura: # DEFINIÇÃO, # PONTOS CHAVE, # PEGADINHAS DE PROVA. 
    REGRAS: 1. PROIBIDO negrito (**). 2. Use Títulos (#) para seções.`;
  } else if (context === 'analise_erros') {
    const stats = statsToAnalyze as any;
    const additionalContext = (stats.gabarito && stats.minha_resposta)
      ? `\nCONTEXTO DO ERRO:\n- Gabarito Oficial: ${stats.gabarito}\n- Resposta do Aluno: ${stats.minha_resposta}\n`
      : "";

    finalPrompt = `Atue como um Analista de Performance (Metodologia FGV).
    Analise o material e os erros para classificar a CAUSA REAL de cada falha.
    ${additionalContext}
    REGRAS DE OURO:
    1. ENUNCIADO INTEGRAL: O campo "enunciado_completo" deve ser a cópia EXATA do texto original (Enunciado + Alternativas).
    2. FOCO NO NOVO: Ignore metadados anteriores.
    3. JSON PURO: Responda EXCLUSIVAMENTE com o array JSON.
    4. NÃO RESUMA: Proibido "..." ou simplificações.

    CONTEÚDO: ${contentToAnalyze}
    
    JSON SCHEMA:
    [
      {
        "questao_preview": "Snippet curto",
        "enunciado_completo": "Cópia Verbatim INTEGRAL",
        "tipo_erro": "Atenção" | "Lacuna de Base" | "Interpretação",
        "gatilho": "Termo exato da falha",
        "sugestao": "Ação imediata aluno",
        "sugestao_mentor": "Dica técnica mentor",
        "gabarito": "Letra ou resposta detectada no texto (Ex: B)",
        "minha_resposta": "Letra ou resposta do aluno detectada (Ex: E)"
      }
    ]`;
  } else if (context === 'macro_diagnostico') {
    const reports = JSON.stringify(contentToAnalyze);
    finalPrompt = `Você é um Mentor de Elite para Concursos Públicos. 
Sua tarefa é analisar um conjunto de relatórios individuais de erros e mentorias e consolidar em um DIAGNÓSTICO DE PERFORMANCE ESTRATÉGICA.

RELATÓRIOS PARA ANÁLISE:
${reports}

ESTRUTURA DA RESPOSTA (Markdown Premium):
## 1. PERÍCIA DE DESEMPENHO (Resumo do padrão de comportamento detectado)
## 2. FATOR CRÍTICO DE BLOQUEIO (O erro mais crítico ou recorrente que está impedindo a aprovação)
## 3. PLANO DE SALTO EVOLUTIVO (Macroestratégia global para os próximos 15 dias)

Seja direto, assertivo e use tom de alta performance. Use Markdown limpo e elegante. Não responda com JSON e NÃO use emojis.`;
  } else {
    finalPrompt = `Você é um professor universitário especialista em concursos públicos, conhecido por sua didática e profundidade. Sua resposta DEVE ser estruturada em Markdown com os seguintes tópicos:\n- **# Explicação Detalhada:** Elabore o conceito com profundidade.\n- **# Exemplo Prático Aprofundado:** Forneça um exemplo prático bem detalhado.\n\nConteúdo: ${contentToAnalyze}`;
  }

  const runGemini = async (key: string) => {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'];
    let lastError: any = null;

    for (const modelId of models) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        }) as any;

        // Extração robusta de texto (compatibilidade com múltiplos padrões de SDK)
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

  const runGroq = async (key: string) => {
    try {
      const systemPrompt = `Você é um especialista sênior em concursos públicos.`;
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
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
    } catch (error: any) {
      throw processAIError(error, 'Groq');
    }
  };

  try {
    if (config.provider === 'gemini') {
      try {
        return await runGemini(config.apiKey);
      } catch (err) {
        if (groqKey && groqKey.length > 10) return await runGroq(groqKey);
        throw err;
      }
    } else {
      try {
        return await runGroq(config.apiKey);
      } catch (err) {
        if (geminiKey && geminiKey.length > 10) return await runGemini(geminiKey);
        throw err;
      }
    }
  } catch (err: any) {
    throw err;
  }
};

// --- ÁUDIO / TTS (Podcast Style) ---

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

    let cacheExists = false;
    try {
      const { data: listData } = await supabase.storage.from(bucketName).list('', { search: fileName });
      if (listData && listData.length > 0) cacheExists = true;
    } catch (e) { logger.warn('AI', 'Erro cache de áudio', { error: e }); }

    if (cacheExists) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (publicUrl) {
        htmlAudio = new Audio(publicUrl);
        htmlAudio.onended = () => onEnd();
        onStart();
        htmlAudio.play().catch(e => onError("Erro reprodução cache."));
        return () => { if (htmlAudio) htmlAudio.pause(); };
      }
    }

    logger.info('AI', 'Áudio elite (v2.5 TTS)');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts", // Modelo TTS Preview Estritamente para MakerSuite
      contents: [{ parts: [{ text: text.substring(0, 4000) }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore'
            }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => { onEnd(); audioContext?.close(); };
    onStart();
    source.start();

    // Cache em background
    (async () => {
      try {
        const wavBlob = createWavFile(new Int16Array(audioBytes.buffer), 24000);
        await supabase.storage.from(bucketName).upload(fileName, wavBlob, { contentType: 'audio/wav', upsert: true });
      } catch (e) { }
    })();

    return () => { if (source) source.stop(); if (audioContext) audioContext.close(); };
  } catch (error: any) {
    onError(processAIError(error, 'Gemini').message);
    onEnd();
    return () => { };
  }
};

export const deleteCachedAudio = async (revisionId: string) => {
  const bucketName = 'audio-revisions';
  try {
    await supabase.storage.from(bucketName).remove([`${revisionId}.wav`, `${revisionId}_podcast.wav`]);
  } catch (e) { }
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

  try {
    const fileName = `${referenceId}_podcast.wav`;
    const bucketName = 'audio-revisions';

    // Verificação de cache simplificada
    onStatusChange("Buscando cache...");
    const { data: listData } = await supabase.storage.from(bucketName).list('', { search: fileName });
    if (listData && listData.length > 0) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        const htmlAudio = new Audio(publicUrlData.publicUrl);
        htmlAudio.onended = () => onEndAudio();
        onStartAudio();
        htmlAudio.play().catch(e => onError("Erro ao tocar podcast."));
        return () => { htmlAudio.pause(); };
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    onStatusChange("Escrevendo roteiro...");
    const scriptPrompt = `Converta o seguinte texto em um diálogo de podcast curto entre Alex e Bia.Formato estrito: Alex: [fala] Bia: [fala].Texto: "${originalText.substring(0, 3000)}"`;
    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }]
    });
    const scriptText = scriptResponse.text || '';

    onStatusChange("Gravando Dual Podcast (Gemini 2.5 TTS)...");
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts", // Modelo TTS Preview Estritamente para MakerSuite
      contents: [{ parts: [{ text: `Atue como locutor de podcast e diga o seguinte: ${scriptText.substring(0, 8000)}` }] }], // Formato {comando}: {texto}
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          languageCode: 'pt-BR',
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
    if (!base64Audio) throw new Error("Podcast generation failed");

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

    // Cache background
    (async () => {
      try {
        const wavBlob = createWavFile(new Int16Array(audioBytes.buffer), 24000);
        await supabase.storage.from(bucketName).upload(fileName, wavBlob, { contentType: 'audio/wav', upsert: true });
      } catch (e) { }
    })();

    return () => { if (source) source.stop(); if (audioContext) audioContext.close(); };
  } catch (error: any) {
    onError(processAIError(error, 'Gemini').message);
    onEndAudio();
    return () => { };
  }
};