import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "./supabase";

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
  console.error(`Erro no ${provider}:`, error);
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
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError: any = null;

  // Prompts sincronizados com o snippet do usuário
  const flashcardPrompt = `Você é um tutor de concursos. Explique o conceito, dê um exemplo, e crie um mnemônico para o flashcard a seguir:\n\n${prompt}`;
  const generalPrompt = `Você é um professor universitário especialista em concursos públicos, conhecido por sua didática e profundidade. Sua resposta DEVE ser estruturada em Markdown com os seguintes tópicos:\n- **# Explicação Detalhada:** Elabore o conceito com profundidade.\n- **# Exemplo Prático Aprofundado:** Forneça um exemplo prático bem detalhado.`;
  const finalPrompt = context === 'flashcard' ? flashcardPrompt : `${generalPrompt}\n\nConteúdo: ${prompt}`;

  for (const modelId of models) {
    try {
      console.log(`🤖 Tentando streaming Gemini SDK (${modelId}) para ${context}...`);
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

      console.log(`✅ Streaming Gemini (${modelId}) completo`);
      callbacks.onComplete();
      return;
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Falha no modelo ${modelId}:`, error.message);
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
    console.log('🚀 Iniciando streaming com Groq...');

    const systemPrompt = `Você é um professor universitário especialista em concursos públicos, conhecido por sua didática e profundidade. Sua resposta DEVE ser estruturada em Markdown com os seguintes tópicos:\n- **# Explicação Detalhada:** Elabore o conceito com profundidade, conectando com outros temas relevantes.\n- **# Exemplo Prático Aprofundado:** Forneça um exemplo prático bem detalhado, com contexto e explicando passo a passo a aplicação do conceito. Se possível, use um cenário de concurso público.`;

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
  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    const error = new Error('Nenhuma chave de IA configurada. Configure Gemini ou Groq nas configurações.');
    callbacks.onError(error);
    return;
  }

  try {
    if (config.provider === 'gemini') {
      try {
        const isFlashcard = prompt.toLowerCase().includes('flashcard') || prompt.toLowerCase().includes('mnemônico');
        await streamWithGemini(config.apiKey, prompt, callbacks, isFlashcard ? 'flashcard' : 'general');
      } catch (err: any) {
        console.error("🔴 Falha crítica no Gemini:", err);
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
      console.warn("JSON Parse inicial falhou, tentando reparo...");
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
    console.error("Falha crítica no parse do JSON da IA:", error);
    console.error("String recebida:", jsonString);
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
    finalPrompt = `Você é um especialista em mapas mentais pedagógicos. Crie um MAPA MENTAL ESTRUTURADO sobre: ${contentToAnalyze}.
    Use a seguinte sintaxe Markdown rigorosa:
    # [TÍTULO CENTRAL]
    ## [RAMO PRINCIPAL]
    ### [SUB-TÓPICO]
    - [DETALHE]
    
    Regras:
    1. Use no máximo 4 níveis de profundidade.
    2. Mantenha os termos curtos e impactantes.
    3. Seja extremamente minucioso na lógica jurídica/técnica.`;
  } else if (context === 'fluxo') {
    finalPrompt = `Você é um analista de processos e lógica jurídica. Gere um FLUXOGRAMA LÓGICO VERTICAL para explicar: ${contentToAnalyze}.
    Use obrigatoriamente as seguintes tags para cada etapa:
    [INÍCIO] -> Breve introdução.
    [AÇÃO] -> Procedimento ou fato.
    [DECISÃO] -> Pergunta ou bifurcação.
    [RESULTADO] -> Conseqüência de uma ação/decisão.
    [FIM] -> Conclusão.
    
    Exemplo de Saída:
    1. [INÍCIO] Texto
    2. [DECISÃO] Texto?
    3. [RESULTADO] Texto
    
    Regras:
    - Seja analítico.
    - Use lógica de causa e efeito clara.`;
  } else if (context === 'tabela') {
    finalPrompt = `Você é um mestre em didática e síntese. Crie uma TABELA COMPARATIVA técnica sobre: ${contentToAnalyze}.
    
    REGRAS DE OURO:
    1. NÃO adicione nenhum texto introdutório ou conclusivo. Responda APENAS com a tabela em Markdown.
    2. Use exatamente 3 colunas: | Critério | Conceito Principal | Comparativo/Oposto |
    3. Seja rigoroso nos termos e use de 4 a 6 linhas de comparação.
    
    Exemplo de Saída:
    | Critério | Conceito Principal | Comparativo/Oposto |
    |---|---|---|
    | Definição | Texto... | Texto... |
    | Fundamento | Texto... | Texto... |`;
  } else if (context === 'info') {
    finalPrompt = `Crie um INFOGRÁFICO RESUMIDO em texto (Cheat Sheet) sobre: ${contentToAnalyze}. 
    Use MUITOS EMOJIS relevantes, TÍTULOS EM MAIÚSCULAS e Bullet Points. 
    Organize em seções como: 📌 DEFINIÇÃO, ⚡ PONTOS CHAVE, ⚠️ PEGADINHAS DE PROVA. 
    Use Markdown para dar um visual premium.`;
  } else if (context === 'analise_erros') {
    finalPrompt = `Você é um analista sênior de desempenho em concursos (Especialista FGV).
    Sua tarefa é analisar o material de estudo e os erros do aluno para classificar a CAUSA REAL de cada falha.

    REGRAS CRÍTICAS DE INTEGRIDADE:
    1. ENUNCIADO NA ÍNTEGRA: O campo "enunciado_completo" DEVE conter o texto original do enunciado e de TODAS as alternativas exatamente como aparecem no texto de entrada. NÃO resuma, NÃO pule partes e NÃO use reticências.
    2. FOCO NO NOVO: Ignore qualquer metadado de "Análise Anterior" ou JSON que possa estar misturado no texto colado pelo aluno. Foque apenas no conteúdo bruto da questão e do erro.
    3. JSON PURO: Responda EXCLUSIVAMENTE com o array JSON. Proibido introduções, conclusões ou markdown fences.
    4. NÃO TRUNQUE VALORES: Se um enunciado for muito longo, mantenha-o completo no JSON. O sistema está preparado para receber objetos grandes.

    ENTRADA BRUTA: 
    ${contentToAnalyze}

    CONTEXTO DE PERFORMANCE: ${JSON.stringify(statsToAnalyze)}
    
    ESQUEMA DO JSON:
    [
      {
        "questao_preview": "Snippet curto (máx 50 char)",
        "enunciado_completo": "Texto ORIGINAL E COMPLETO (Enunciado + Alternativas) - Copie Verbatim!",
        "tipo_erro": "Atenção" | "Lacuna de Base" | "Interpretação",
        "gatilho": "O termo ou conceito exato que causou a falha",
        "sugestao": "Ação imediata para o ALUNO",
        "sugestao_mentor": "Dica técnica para o MENTOR"
      }
    ]

    CRITÉRIOS DE CLASSIFICAÇÃO:
    - Atenção: O aluno marcou a oposta, ignorou "Exceto/Não", ou caiu em pegadinha óbvia.
    - Lacuna de Base: O aluno não conhecia o conceito jurídico ou técnico básico.
    - Interpretação: O aluno errou o entendimento luso-textual da pergunta.

    ORDEM FINAL: 
    - Fale APENAS através do JSON.
    - PROIBIDO usar "..." ou resumir enunciados. Se o texto for longo, COPIE CADA PALAVRA.
    - O campo "enunciado_completo" deve ser uma réplica exata do texto de entrada.
    - Se você resumir, a vida do aluno será prejudicada. NÃO RESUMA. COPIE TUDO.`;
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
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
          console.warn("Falha na extração refinada do texto Gemini:", e);
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
    } catch (e) { console.warn("Erro cache:", e); }

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

    console.log("🎙️ Áudio elite (v2.5 TTS)...");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Nome atualizado
      contents: [{ parts: [{ text: text.substring(0, 4000) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
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
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }]
    });
    const scriptText = scriptResponse.text || '';

    onStatusChange("Gravando Dual Podcast (Gemini 2.5 TTS)...");
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Nome atualizado
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