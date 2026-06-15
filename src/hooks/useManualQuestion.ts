import { useState } from 'react';
import { generateAIContent, parseAIJSON } from '../services/aiService';
import { GabaritoItem } from '../types';
import { getGeminiKey, getGroqKey } from '../services/supabase';

const AI_PROMPT_SINGLE_QUESTION = `
Você é um examinador especialista em concursos. Sua tarefa é analisar a questão a seguir, determinar a alternativa correta e fornecer uma justificativa técnica detalhada.

**Entrada:**
- **Enunciado:** {ENUNCIADO}
- **Alternativas:** {ALTERNATIVAS}

**SAÍDA ESTRITA EM JSON (UM ÚNICO OBJETO):** Sua resposta DEVE ser um objeto JSON válido, usando o schema fornecido.
`;

interface SingleQuestionAnalysisResult {
  alternativa_correta_ia: string;
  justificativa: string;
}

interface ManualQuestionData {
  numero: string;
  enunciado: string;
  alternativas: string;
}

export const useManualQuestion = (onQuestionAdded: (q: GabaritoItem) => void) => {
  const [showModal, setShowModal] = useState(false);
  const [questionData, setQuestionData] = useState<ManualQuestionData>({ numero: '', enunciado: '', alternativas: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!questionData.numero || !questionData.enunciado) {
      setError("O número da questão e o enunciado são obrigatórios.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const prompt = AI_PROMPT_SINGLE_QUESTION
        .replace('{ENUNCIADO}', questionData.enunciado)
        .replace('{ALTERNATIVAS}', questionData.alternativas);

      const responseText = await generateAIContent(
        prompt,
        getGeminiKey(),
        getGroqKey()
      );

      const parsed = parseAIJSON(responseText) as SingleQuestionAnalysisResult;
      const newQuestion: GabaritoItem = {
        numero_questao: parseInt(questionData.numero),
        enunciado: questionData.enunciado,
        alternativa_correta_ia: parsed.alternativa_correta_ia || '?',
        justificativa: parsed.justificativa || 'Análise falhou.'
      };

      onQuestionAdded(newQuestion);

      setShowModal(false);
      setQuestionData({ numero: '', enunciado: '', alternativas: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError("Falha na análise da IA: " + message);
    } finally {
      setLoading(false);
    }
  };

  return {
    showModal,
    setShowModal,
    questionData,
    setQuestionData,
    loading,
    error,
    handleSubmit,
  };
};
