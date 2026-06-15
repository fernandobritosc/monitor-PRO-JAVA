import { AIStreamCallback, AIContext, AIProviderName } from './types';
import { detectAIProvider } from './provider';
import { streamWithGemini, getGeneratePrompt, runGemini } from './gemini';
import { streamWithGroq, runGroq } from './groq';
import { checkRateLimit, RateLimitError } from '../../utils/rateLimiter';
import { setAIOperationContext, captureAIError, startAIPerformanceTrace } from '../telemetry';
import { logger } from '../../utils/logger';

export const streamAIContent = async (
  prompt: string,
  callbacks: AIStreamCallback,
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProviderName
): Promise<void> => {
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

export const generateAIContent = async (
  prompt: string | { content: string; stats?: any },
  geminiKey?: string,
  groqKey?: string,
  preferredProvider?: AIProviderName,
  context: AIContext = 'general'
): Promise<string> => {
  const contentToAnalyze = typeof prompt === 'string' ? prompt : prompt.content;
  const config = detectAIProvider(geminiKey, groqKey, preferredProvider);

  if (!config) {
    throw new Error('Nenhuma chave de IA configurada');
  }

  let finalPrompt = "";

  if (context === 'analise_erros') {
    const stats = (typeof prompt !== 'string' ? prompt.stats || {} : {}) as any;
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
  } else if (context === 'explicar_erro') {
    const ctx = JSON.parse(contentToAnalyze);
    const statusText = ctx.isCorrect ? "ACERTOU (Reforço positivo e aprofundamento)" : `ERROU (${ctx.tipo_erro})`;
    
    finalPrompt = `Você é o Mentor Neural do MonitorPro, um especialista em didática para concursos de elite.
    Sua missão é discutir a questão abaixo com o aluno. O aluno ${statusText}.

    CONTEXTO DA QUESTÃO:
    - Matéria: ${ctx.materia}
    - Assunto: ${ctx.assunto}
    - Questão (Enunciado): ${ctx.question}
    - Gabarito Oficial: ${ctx.gabarito}
    - Tentativas anteriores: ${ctx.attempts}

    ESTRUTURA DA RESPOSTA (Markdown Premium):
    # ${ctx.isCorrect ? 'DOMÍNIO TÉCNICO' : 'O CONCEITO CHAVE'}
    [${ctx.isCorrect ? 'Parabenize pelo acerto e aprofunde o detalhe técnico que diferencia o aprovado do amador.' : 'Explique o núcleo jurídico/técnico do assunto de forma cristalina. Foque no que o aluno NÃO percebeu.'}]

    # ${ctx.isCorrect ? 'DETALHE DE ELITE' : 'POR QUE VOCÊ ERROU?'}
    [${ctx.isCorrect ? 'Aponte uma pegadinha que essa mesma questão poderia ter ou um desdobramento avançado desse tema.' : `Análise clínica baseada no tipo de erro (${ctx.tipo_erro}). Identifique o gatilho da falha.`}]

    # MEMORIZAÇÃO DEFINITIVA
    [Dê uma dica prática, mnemônico ou técnica para NUNCA MAIS esquecer este ponto específico.]

    REGRAS: 
    1. Tom de mentor de alta performance (direto, técnico, focado em evolução).
    2. Proibido negrito (**).
    3. Sem saudações.`;
  } else if (context === 'chat_error_vault') {
    const ctx = JSON.parse(contentToAnalyze);
    finalPrompt = `Você é o Mentor Neural do MonitorPro. Você está conversando com um aluno sobre uma questão específica de ${ctx.materia} (${ctx.assunto}).
    Gabarito Oficial: ${ctx.gabarito}.
    O aluno está tirando dúvidas sobre esta questão. Responda de forma técnica, direta e pedagógica.
    
    CONTEXTO DA QUESTÃO:
    ${ctx.question}
    
    HISTÓRICO DA CONVERSA ATUAL:
    ${JSON.stringify(ctx.history)}
    
    ÚLTIMA PERGUNTA DO ALUNO:
    ${ctx.lastMessage}
    
    REGRAS:
    1. Responda em no máximo 2 parágrafos.
    2. Proibido negrito (**).
    3. Seja um mentor de elite: desafie o aluno a pensar.`;
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
    finalPrompt = getGeneratePrompt(contentToAnalyze, context);
  }

  try {
    if (config.provider === 'gemini') {
      try {
        return await runGemini(config.apiKey, finalPrompt);
      } catch (err) {
        const groqKey_ = groqKey;
        if (groqKey_ && groqKey_.length > 10) return await runGroq(groqKey_, finalPrompt);
        throw err;
      }
    } else {
      try {
        return await runGroq(config.apiKey, finalPrompt);
      } catch (err) {
        const geminiKey_ = geminiKey;
        if (geminiKey_ && geminiKey_.length > 10) return await runGemini(geminiKey_, finalPrompt);
        throw err;
      }
    }
  } catch (err: any) {
    throw err;
  }
};
