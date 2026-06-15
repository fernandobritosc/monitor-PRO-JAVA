import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { getGeminiKey, getGroqKey } from '../services/supabase';
import { flashcardsQueries } from '../services/queries';
import { streamAIContent, generateAIContent, AIProviderName } from '../services/aiService';
import { Flashcard } from '../types';
import { getErrorMessage } from '../utils/error';
import { logger } from '../utils/logger';

export interface UseAIFlashcardsProps {
  currentCard: Flashcard | undefined;
  studyQueue: Flashcard[];
  currentCardIndex: number;
  setStudyQueue: Dispatch<SetStateAction<Flashcard[]>>;
  selectedAI: AIProviderName | 'auto';
}

export const useAIFlashcards = ({ currentCard, studyQueue, currentCardIndex, setStudyQueue, selectedAI }: UseAIFlashcardsProps) => {
  const [aiStreamText, setAiStreamText] = useState<string>("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mnemonicText, setMnemonicText] = useState<string>("");
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [extraFormat, setExtraFormat] = useState<'mapa' | 'fluxo' | 'tabela' | 'info' | null>(null);
  const [extraContent, setExtraContent] = useState<string>('');
  const [extraLoading, setExtraLoading] = useState<boolean>(false);
  const [activeAiTool, setActiveAiTool] = useState<'explanation' | 'mnemonic' | 'mapa' | 'fluxo' | 'tabela' | 'info'>('explanation');

  const lastCardIdRef = useRef<string | null>(null);
  const prevQueueLenRef = useRef(0);

  useEffect(() => {
    const len = studyQueue.length;
    const prevLen = prevQueueLenRef.current;
    prevQueueLenRef.current = len;

    if (len > 0 && prevLen === 0) {
      setAiStreamText("");
      setFollowUpQuery("");
    } else if (len === 0 && prevLen > 0) {
      setAiStreamText("");
      setFollowUpQuery("");
      setMnemonicText("");
    }
  }, [studyQueue, setAiStreamText, setFollowUpQuery, setMnemonicText]);

  const saveAiAsset = async (assetType: keyof NonNullable<Flashcard['ai_generated_assets']>, content: string) => {
    if (!currentCard) return;

    const currentAssets = studyQueue[currentCardIndex]?.ai_generated_assets || {};
    const newAssets = { ...currentAssets, [assetType]: content };

    const updatedQueue = studyQueue.map((c, i) =>
      i === currentCardIndex ? { ...c, ai_generated_assets: newAssets } : c
    );
    setStudyQueue(updatedQueue);

    try {
      await flashcardsQueries.update(currentCard.id, { ai_generated_assets: newAssets });
      logger.log(`✅ Asset '${String(assetType)}' salvo para o card ${currentCard.id}`);
    } catch (error) {
      logger.error('AI', "Erro ao salvar asset de IA:", getErrorMessage(error));
    }
  };

  const generateAIExplanation = async () => {
    if (!currentCard || aiLoading) return;

    setAiLoading(true);
    setAiStreamText('');
    setFollowUpQuery('');

    const preferred = selectedAI === 'auto' ? undefined : selectedAI;
    let accumulatedText = "";

    const prompt = `Pergunta: "${currentCard.front}"\nResposta: "${currentCard.back}"`;

    await streamAIContent(prompt, {
      onChunk: (text: string) => { setAiStreamText(prev => prev + text); accumulatedText += text; },
      onComplete: async () => { setAiLoading(false); await saveAiAsset('explanation', accumulatedText); },
      onError: (error: Error) => {
        logger.error('AI', "AI Fatal Error:", error);
        setAiStreamText('❌ Falha Crítica: Todos os motores de IA falharam.\n\nDetalhes: ' + error.message + '\n\n💡 Tente trocar manualmente para Groq nas configurações ou verifique suas chaves.');
        setAiLoading(false);
      }
    }, getGeminiKey(), getGroqKey(), preferred);
  };

  const handleGenerateMnemonic = async () => {
    if (!currentCard || mnemonicLoading) return;
    setMnemonicLoading(true);
    setMnemonicText("");

    try {
      const concept = `PERGUNTA: '${currentCard.front}' / RESPOSTA: '${currentCard.back}'`;
      const result = await generateAIContent(concept, getGeminiKey(), getGroqKey(), selectedAI === 'auto' ? undefined : selectedAI, 'flashcard');
      setMnemonicText(result);
      await saveAiAsset('mnemonic', result);
    } catch (error) {
      logger.error('AI', "Erro ao gerar mnemônico:", getErrorMessage(error));
      setMnemonicText("Desculpe, não foi possível criar um mnemônico agora.");
    } finally {
      setMnemonicLoading(false);
    }
  };

  const handleGenerateExtraFormat = async (format: 'mapa' | 'fluxo' | 'tabela' | 'info') => {
    if (!currentCard || extraLoading) return;
    setExtraFormat(format);
    setExtraLoading(true);
    setExtraContent("");

    try {
      const concept = `PERGUNTA: '${currentCard.front}' / RESPOSTA: '${currentCard.back}'`;

      const result = await generateAIContent(concept, getGeminiKey(), getGroqKey(), selectedAI === 'auto' ? undefined : selectedAI, format);
      setActiveAiTool(format);

      if (!result || result.trim() === '') {
        throw new Error("A IA retornou uma resposta vazia.");
      }

      setExtraContent(result);
      await saveAiAsset(format, result);
    } catch (error) {
      const msg = getErrorMessage(error);
      logger.error('AI', `Erro ao gerar ${format}:`, msg);
      setExtraContent(`Desculpe, não foi possível gerar o formato "${format}" para este card. Motivo: ${msg}`);
    } finally {
      setExtraLoading(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!currentCard || !followUpQuery.trim() || !aiStreamText) return;
    const preferred = selectedAI === 'auto' ? undefined : selectedAI;
    setAiLoading(true);
    const questionText = `\n\n🤔 **Você:** ${followUpQuery}\n\n🤖 **Tutor:** `;
    setAiStreamText(prev => prev + questionText);
    const queryToSend = followUpQuery;
    setFollowUpQuery("");
    const contextPrompt = `ATENÇÃO: Você é um Tutor Especialista.\nCONTEXTO: Matéria: ${currentCard.materia}. Card: "${currentCard.front}" -> "${currentCard.back}".\nHISTÓRICO: ${aiStreamText}\nNOVA PERGUNTA: "${queryToSend}"\nDIRETRIZES: 1. Responda apenas à nova dúvida. 2. Seja didático.`;

    let fullConversation = aiStreamText + questionText;

    await streamAIContent(contextPrompt, {
      onChunk: (text: string) => {
        setAiStreamText(prev => prev + text);
        fullConversation += text;
      },
      onComplete: async () => {
        setAiLoading(false);
        await saveAiAsset('explanation', fullConversation);
      },
      onError: (_error: Error) => { setAiStreamText(prev => prev + '\n[Erro na resposta]'); setAiLoading(false); }
    }, getGeminiKey(), getGroqKey(), preferred);
  };

  useEffect(() => {
    if (studyQueue.length > 0 && currentCardIndex < studyQueue.length) {
      const card = studyQueue[currentCardIndex];
      if (lastCardIdRef.current !== card.id) {
        setFollowUpQuery("");
        setAiStreamText(card.ai_generated_assets?.explanation ?? "");
        setMnemonicText(card.ai_generated_assets?.mnemonic ?? "");
        setExtraContent('');
        setExtraFormat(null);
        setActiveAiTool('explanation');
        lastCardIdRef.current = card.id;
      }
    }
  }, [currentCardIndex, studyQueue]);

  useEffect(() => {
    if (!currentCard) return;
    const assets = currentCard.ai_generated_assets;
    if (!assets) return;

    if (activeAiTool === 'explanation') {
      if (!aiLoading && assets.explanation) setAiStreamText(assets.explanation);
    } else if (activeAiTool === 'mnemonic') {
      if (!mnemonicLoading && assets.mnemonic) setMnemonicText(assets.mnemonic);
    } else if (assets[activeAiTool]) {
      if (!extraLoading) {
        setExtraContent(assets[activeAiTool]!);
        setExtraFormat(activeAiTool as 'mapa' | 'fluxo' | 'tabela' | 'info');
      }
    }
  }, [activeAiTool, currentCard, aiLoading, mnemonicLoading, extraLoading]);

  useEffect(() => {
    setAiStreamText("");
    setMnemonicText("");
    setExtraContent('');
    setExtraFormat(null);
  }, [selectedAI]);

  return {
    aiStreamText, setAiStreamText,
    aiLoading,
    mnemonicText, setMnemonicText,
    mnemonicLoading,
    extraFormat, setExtraFormat,
    extraContent, setExtraContent,
    extraLoading,
    followUpQuery, setFollowUpQuery,
    activeAiTool, setActiveAiTool,
    generateAIExplanation,
    handleGenerateMnemonic,
    handleGenerateExtraFormat,
    handleSendFollowUp,
  };
};
