import { useState } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent } from '../services/aiService';
import { discursivasQueries } from '../services/queries';
import { trackEvent, captureError } from '../services/telemetry';
import { Discursiva as DiscursivaType } from '../types';

const AI_PROMPT = `
Você é um examinador especialista em provas discursivas para concursos de alto nível no Brasil, atuando com o MÁXIMO rigor e critério, emulando uma banca real e implacável. Sua avaliação deve ser crítica, detalhada e determinística.

**REGRAS DE OURO:**
1.  **CONSISTÊNCIA TOTAL:** Sua análise deve ser consistente. A mesma redação, submetida múltiplas vezes, DEVE receber exatamente a mesma nota e a mesma análise. Siga os critérios de forma robótica.
2.  **RIGOR EXTREMO:** Seja extremamente severo na pontuação. Erros pequenos DEVEM impactar a nota. Não hesite em atribuir notas baixas para preparar o candidato para o pior cenário.
3.  **SEMPRE SIGA O FORMATO:** A resposta DEVE seguir o formato Markdown especificado abaixo, sem exceções.

**Critérios de Avaliação (Total: 10 pontos):**

1.  **Atendimento ao tema proposto (0 a 2 pontos):** Avalie se o texto aborda o tema central de forma completa, sem tangenciar ou fugir do proposto.
2.  **Clareza de argumentação/senso crítico (0 a 1 ponto):** Verifique a pertinência dos argumentos, a profundidade da análise e a capacidade de relacionar fatos e opiniões.
3.  **Seletividade de informação (0 a 1 ponto):** Analise se o candidato selecionou, organizou e relacionou as informações de forma consistente com o tema.
4.  **Criatividade/originalidade (0 a 2 pontos):** Avalie a originalidade na abordagem, evitando o senso comum.
5.  **Atendimento à norma padrão (0 a 1 ponto):** Verifique desvios gramaticais (ortografia, morfossintaxe, pontuação). Aponte os erros de forma clara na tabela.
6.  **Coerência (0 a 1 ponto):** Analise a progressão lógica das ideias e a ausência de contradições.
7.  **Coesão (0 a 1 ponto):** Verifique o uso adequado de conectivos, pronomes e outros elementos de ligação.
8.  **Atendimento à tipologia textual (0 a 1 ponto):** Confirme se o texto é dissertativo-argumentativo em prosa.

**Formato da Resposta:**

## Análise da Redação

### 1. Atendimento ao tema proposto
**Nota:** [Sua nota]/2.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 2. Clareza de argumentação/senso crítico
**Nota:** [Sua nota]/1.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 3. Seletividade de informação
**Nota:** [Sua nota]/1.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 4. Criatividade/originalidade
**Nota:** [Sua nota]/2.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 5. Atendimento à norma padrão
**Nota:** [Sua nota]/1.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 6. Coerência
**Nota:** [Sua nota]/1.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 7. Coesão
**Nota:** [Sua nota]/1.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

### 8. Atendimento à tipologia textual
**Nota:** [Sua nota]/1.0
**Justificativa:** [Sua análise detalhada com exemplos]
**Melhoria Sugerida:** [Sugestão específica para este critério]

---

### Tabela de Desvios Gramaticais
| Linha (Aprox.) | Trecho com Desvio | Sugestão de Correção |
|---|---|---|
| ... | ... | ... |

---

### Plano de Ação para Melhoria
**Instruções:** Com base na sua análise, crie uma lista de ações práticas (bullet points) para cada um dos 8 critérios, focando nos pontos mais fracos.

*   **Atendimento ao tema:**
    *   [Ação 1]
    *   [Ação 2]
*   **Clareza de argumentação:**
    *   [Ação 1]
... (e assim por diante)

---

## Nota Final
**Nota Total:** [Soma das notas]/10
**Comentário Final:** [Um parágrafo com um feedback geral, pontos fortes e principais pontos a melhorar.]
`;

const extractFinalScore = (text: string | null): string => {
  if (!text) return 'N/A';
  const match = text.match(/\**\s*nota total\s*:\s*\**\s*([^\r\n]+)/i);
  if (match && match[1]) {
    return match[1].replace(/\s+/g, ' ').trim();
  }
  return 'N/A';
};

interface UseDiscursivaAnalysisProps {
  file: File | null;
  title: string;
  prompt: string;
  geminiKeyAvailable: boolean;
  onSuccess: (record: DiscursivaType) => void;
}

export { extractFinalScore };
export const useDiscursivaAnalysis = ({ file, title, prompt, geminiKeyAvailable, onSuccess }: UseDiscursivaAnalysisProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DiscursivaType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!file || !title) {
      setError("Por favor, adicione um título e uma imagem da redação.");
      return;
    }
    if (!geminiKeyAvailable) {
      setError("Chave da API Gemini não configurada na aba Sistema.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    trackEvent('Discursiva_Analysis_Started', { title });

    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('discursivas_images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('discursivas_images').getPublicUrl(fileName);

      let finalPrompt = AI_PROMPT;
      if (prompt.trim()) {
        finalPrompt = `
**CONTEXTO DA QUESTÃO (ENUNCIADO):**
"""
${prompt}
"""
Com base ESTRITAMENTE no enunciado acima, analise a redação a seguir. Sua principal tarefa é avaliar o "Atendimento ao tema proposto" em relação a este enunciado específico.
---
${AI_PROMPT}
        `;
      }

      const analysisText = await generateAIContent(
        finalPrompt,
        getGeminiKey(),
        getGroqKey()
      );

      const newRecord = await discursivasQueries.insert({
        user_id: user.id,
        title,
        prompt,
        image_url: publicUrl,
        analysis_text: analysisText,
      });

      setAnalysisResult(newRecord);
      trackEvent('Discursiva_Analysis_Success', { title, score: extractFinalScore(analysisText) });
      onSuccess(newRecord);
    } catch (err: any) {
      captureError(err, { stage: 'discursiva_analysis' });
      if (err.message && (err.message.includes("column \"prompt\" of relation \"discursivas\" does not exist") || err.message.includes("column 'prompt' does not exist"))) {
        setError("ERRO DE BANCO DE DADOS: Sua tabela 'discursivas' está desatualizada. Por favor, execute o script SQL mais recente (botão 'Permissões (SQL)') para adicionar a coluna 'prompt'.");
      } else {
        setError(`Falha na análise: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, analysisResult, error, handleAnalyze, setError };
};
