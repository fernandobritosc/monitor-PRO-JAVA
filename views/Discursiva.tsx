import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent } from '../services/aiService';
import { GoogleGenAI } from "@google/genai";
import { Discursiva as DiscursivaType } from '../types';
import {
  FileEdit, UploadCloud, Loader2, Sparkles, Download, Database, Copy, X, Trash2, Image as ImageIcon, MessageSquare, List, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, CheckCircle2, Calendar
} from 'lucide-react';

// Declaração para TypeScript reconhecer a biblioteca global
declare global {
  interface Window {
    jspdf: any;
  }
}

const SQL_SCRIPT = `
-- 1. TABELA DE DISCURSIVAS
CREATE TABLE IF NOT EXISTS public.discursivas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text,
  prompt text, -- NOVO CAMPO PARA O ENUNCIADO
  image_url text NOT NULL,
  analysis_text text,
  created_at timestamp with time zone DEFAULT now()
);

-- GARANTIR COLUNA NOVA (Para quem já tem a tabela)
ALTER TABLE discursivas ADD COLUMN IF NOT EXISTS prompt text;

-- 2. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('discursivas_images', 'discursivas_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. POLÍTICAS DE STORAGE
DROP POLICY IF EXISTS "Public Access Discursivas" ON storage.objects;
CREATE POLICY "Public Access Discursivas" ON storage.objects FOR SELECT USING ( bucket_id = 'discursivas_images' );

DROP POLICY IF EXISTS "Authenticated Upload Discursivas" ON storage.objects;
CREATE POLICY "Authenticated Upload Discursivas" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'discursivas_images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Delete Discursivas" ON storage.objects;
CREATE POLICY "Authenticated Delete Discursivas" ON storage.objects FOR DELETE USING ( bucket_id = 'discursivas_images' AND auth.uid() = owner );

-- 4. POLÍTICAS DE TABELA (RLS)
ALTER TABLE discursivas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Leitura Propria" ON discursivas;
CREATE POLICY "Permitir Leitura Propria" ON discursivas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Criacao Propria" ON discursivas;
CREATE POLICY "Permitir Criacao Propria" ON discursivas FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Exclusao Propria" ON discursivas;
CREATE POLICY "Permitir Exclusao Propria" ON discursivas FOR DELETE USING (auth.uid() = user_id);
`;

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
  // Regex super robusta: Procura por "nota total:", ignorando maiúsculas/minúsculas, 
  // espaços e asteriscos opcionais, e captura o resto da linha.
  const match = text.match(/\**\s*nota total\s*:\s*\**\s*([^\r\n]+)/i);
  if (match && match[1]) {
    // Limpa espaços extras e retorna
    return match[1].replace(/\s+/g, ' ').trim();
  }
  return 'N/A';
};

const Discursiva: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [history, setHistory] = useState<DiscursivaType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState(''); // NOVO: State para o enunciado

  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DiscursivaType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showSql, setShowSql] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<DiscursivaType | null>(null);

  const geminiKeyAvailable = !!getGeminiKey();

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.from('discursivas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar histórico:", err);
      if (err.message.includes('relation "public.discursivas" does not exist')) {
        setError("Tabela 'discursivas' não encontrada. Execute o script SQL de configuração.");
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

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

    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('discursivas_images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('discursivas_images').getPublicUrl(fileName);

      // LÓGICA CONDICIONAL DO PROMPT
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
      // Nota: Atualmente generateAIContent não processa imagem no Groq.
      // Se Gemini falhar, o Groq tentará analisar apenas pelo enunciado (finalPrompt).

      const { data: newRecord, error: dbError } = await supabase
        .from('discursivas')
        .insert({
          user_id: user.id,
          title,
          prompt, // SALVA O ENUNCIADO NO BANCO
          image_url: publicUrl,
          analysis_text: analysisText,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setAnalysisResult(newRecord);
      fetchHistory();
      setActiveTab('history');
      setSelectedHistory(newRecord);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("column \"prompt\" of relation \"discursivas\" does not exist") || err.message.includes("column 'prompt' does not exist"))) {
        setError("ERRO DE BANCO DE DADOS: Sua tabela 'discursivas' está desatualizada. Por favor, execute o script SQL mais recente (botão 'Permissões (SQL)') para adicionar a coluna 'prompt'.");
      } else {
        setError(`Falha na análise: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta análise permanentemente?")) return;
    try {
      const itemToDelete = history.find(h => h.id === id);
      if (itemToDelete) {
        const fileName = itemToDelete.image_url.split('/').pop();
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (fileName && user) {
          await supabase.storage.from('discursivas_images').remove([`${user.id}/${fileName}`]);
        }
      }
      const { error } = await supabase.from('discursivas').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedHistory?.id === id) setSelectedHistory(null);
    } catch (err: any) {
      setError("Falha ao excluir: " + err.message);
    }
  }

  const generatePDF = async (analysis: DiscursivaType) => {
    if (!window.jspdf) {
      alert("Biblioteca PDF não carregada. Recarregue a página.");
      return;
    }

    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      const userIdentifier = user?.email || 'N/A';

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 0;

      // --- HEADER ---
      doc.setFillColor(18, 21, 29); // #12151D
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("MONITOR", 14, 20);
      const monitorWidth = doc.getTextWidth("MONITOR");
      doc.setTextColor(6, 182, 212); // Cyan
      doc.text("PRO", 14 + monitorWidth + 1, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 236, 236); // Cyan
      doc.text("Relatório de Análise Discursiva", 14, 28);

      // --- INFO BLOCK ---
      currentY = 40;
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text("Informações da Análise", 14, currentY);
      currentY += 5;

      (doc as any).autoTable({
        startY: currentY,
        body: [
          ['ALUNO(A)', userIdentifier],
          ['TEMA', analysis.title],
          ['ID REGISTRO', analysis.id.substring(0, 8).toUpperCase()],
          ['DATA', new Date(analysis.created_at).toLocaleString('pt-BR')],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100] } },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;

      const text = analysis.analysis_text;
      const criteriaRegex = /###\s*\d+\.\s*(.*?)\n\*\*Nota:\*\*\s*(.*?)\n\*\*Justificativa:\*\*\s*(.*?)\n\*\*Melhoria Sugerida:\*\*\s*(.*?)(?=\n###|\n---)/gs;
      const grammarTableRegex = /\| Linha \(Aprox\.\) \|.*?\|\n\|---\|.*?\|\n((?:\|.*\|\n?)*)/s;
      const improvementPlanRegex = /### Plano de Ação para Melhoria\n(.*?)(?=\n---)/s;
      const finalScoreRegex = /## Nota Final\n\*\*Nota Total:\*\*\s*(.*?)\n\*\*Comentário Final:\*\*\s*(.*)/s;

      doc.setFontSize(14);
      doc.text("Análise por Critério", 14, currentY);
      currentY += 6;
      const criteriaData = [];
      let match;
      while ((match = criteriaRegex.exec(text)) !== null) {
        criteriaData.push([match[1].trim(), match[2].trim(), `${match[3].trim()}\n\nMelhoria: ${match[4].trim()}`]);
      }
      (doc as any).autoTable({
        startY: currentY,
        head: [['Critério', 'Nota', 'Justificativa & Sugestão']],
        body: criteriaData,
        theme: 'grid',
        headStyles: { fillColor: [88, 28, 135], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 'auto' } },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;

      const grammarMatch = text.match(grammarTableRegex);
      if (grammarMatch && (grammarMatch[1] || '').trim()) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.text("Tabela de Desvios Gramaticais", 14, currentY);
        currentY += 6;
        const grammarBody = (grammarMatch[1] || '').trim().split('\n').map(row => row.split('|').slice(1, -1).map(cell => cell.trim()));
        (doc as any).autoTable({
          startY: currentY,
          head: [['Linha (Aprox.)', 'Trecho com Desvio', 'Sugestão de Correção']],
          body: grammarBody,
          theme: 'striped',
          headStyles: { fillColor: [75, 85, 99] },
          styles: { fontSize: 8 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      const planMatch = text.match(improvementPlanRegex);
      if (planMatch && (planMatch[1] || '').trim()) {
        if (currentY > 220) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.text("Plano de Ação para Melhoria", 14, currentY);
        currentY += 6;

        const planBody = [];
        const planText = (planMatch[1] || '').trim();
        const categories = planText.split(/\*\s*\*\*(.*?)\*\*/g).filter(c => c.trim() && c !== ':');

        for (let i = 0; i < categories.length; i += 2) {
          const categoryName = categories[i];
          const actionsText = categories[i + 1] || '';
          const actions = actionsText.split(/\n\s*\*/g).map(action => `• ${action.trim()}`).filter(action => action.length > 2).join('\n');
          planBody.push([categoryName, actions]);
        }

        (doc as any).autoTable({
          startY: currentY,
          head: [['Critério de Melhoria', 'Plano de Ação Sugerido']],
          body: planBody,
          theme: 'grid',
          headStyles: { fillColor: [40, 50, 60] },
          styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 'auto' } },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      const finalMatch = text.match(finalScoreRegex);
      if (finalMatch) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        (doc as any).autoTable({
          startY: currentY,
          body: [
            [{ content: 'Nota Final', styles: { fontStyle: 'bold' } }, { content: finalMatch[1].trim(), styles: { fontStyle: 'bold', fontSize: 14, halign: 'center' } }],
            [{ content: 'Comentário Geral', styles: { fontStyle: 'bold' } }, finalMatch[2].trim()]
          ],
          theme: 'grid',
          styles: { fontSize: 9 }
        });
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado via MonitorPro - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`Analise_Discursiva_${analysis.id.substring(0, 8)}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao gerar PDF: " + err.message);
    }
  };

  const AnalysisView = ({ analysis }: { analysis: DiscursivaType }) => {
    const [isImageVisible, setIsImageVisible] = useState(false);
    const [isAnalysisVisible, setIsAnalysisVisible] = useState(true);

    const GrammarTable = ({ tableData }: { tableData: any }) => {
      if (!tableData || !tableData.hasContent) {
        return (
          <div className="my-8 p-10 bg-[hsl(var(--bg-user-block))/0.3] rounded-[2rem] border border-dashed border-[hsl(var(--border))] text-center">
            <CheckCircle2 size={32} className="mx-auto text-green-500/30 mb-4" />
            <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum desvio crítico detectado nesta matriz.</p>
          </div>
        );
      }
      return (
        <div className="overflow-hidden my-8 glass-premium bg-[hsl(var(--bg-user-block))/0.2] rounded-[2rem] border border-[hsl(var(--border))] shadow-inner">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[hsl(var(--bg-user-block))] border-b border-[hsl(var(--border))]">
                {tableData.header.map((h: string) => <th key={h} className="p-6 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {tableData.body.map((row: string[], rowIndex: number) => (
                <tr key={rowIndex} className="hover:bg-white/5 transition-colors group">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-6 text-xs font-medium text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))] transition-colors">{cell.replace(/"/g, '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    const parsedContent = useMemo(() => {
      const text = analysis.analysis_text;
      if (!text) return { before: null, table: null, after: null };

      const renderProse = (proseText: string) => {
        if (!proseText.trim()) return null;
        let processedHtml = proseText
          .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-[var(--accent)] mt-6 mb-3">$1</h2>')
          .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-[var(--text-bright)] mt-4 mb-2">$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^---$/gim, '<hr class="my-6 border-[var(--border)]">')
          .replace(/^\* (.*$)/gim, '<li>$1</li>')
          .replace(/<li><strong>(.*?)<\/strong>:/gim, '<ul class="mt-3 list-none p-0"><li class="font-bold text-slate-300">$1</li><ul class="list-disc ml-5 mt-1">')
          .replace(/(<\/ul><br \/>)<br \/><li><strong>/g, '</ul></ul><ul class="mt-3 list-none p-0"><li class="font-bold text-slate-300">')
          .replace(/\n/g, '<br />')
          .replace(/<\/h2><br \/>/g, '</h2>')
          .replace(/<\/h3><br \/>/g, '</h3>')
          .replace(/<hr><br \/>/g, '<hr>')
          .replace(/<\/li><br \/>/g, '</li>');
        return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />;
      };

      const tableHeaderMarkdown = '### Tabela de Desvios Gramaticais';
      const parts = text.split(tableHeaderMarkdown);
      const before = renderProse(parts[0]);
      let table = null;
      let after = null;

      if (parts.length > 1) {
        const tableAndAfter = parts[1] || '';
        const tableRegex = /(\|.*\|(?:\r?\n\|.*\|)+)/;
        const match = tableAndAfter.match(tableRegex);

        if (match) {
          const tableMarkdown = match[0];
          const afterText = tableAndAfter.replace(tableMarkdown, '');
          after = renderProse(afterText);
          const rows = tableMarkdown.trim().split('\n');
          const header = rows[0].split('|').slice(1, -1).map(h => h.trim());
          const body = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
          const hasContent = body.some(row => row.join('').trim() !== '' && !row.every(cell => cell.includes('...')));
          table = <GrammarTable tableData={{ header, body, hasContent }} />;
        } else {
          after = renderProse(tableAndAfter);
        }
      }
      return { before, table, after };
    }, [analysis.analysis_text]);

    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        {analysis.prompt && (
          <div className="glass-premium bg-[hsl(var(--bg-user-block))/0.3] rounded-3xl p-8 border border-[hsl(var(--border))]">
            <h3 className="text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
              <div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-lg text-[hsl(var(--accent))]"><List size={16} /></div>
              Enunciado de Referência
            </h3>
            <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed whitespace-pre-wrap bg-[hsl(var(--bg-main))] p-6 rounded-2xl border border-[hsl(var(--border))] shadow-inner">
              {analysis.prompt}
            </p>
          </div>
        )}

        <div className="glass-premium bg-[hsl(var(--bg-user-block))/0.3] rounded-3xl p-8 border border-[hsl(var(--border))] overflow-hidden">
          <button onClick={() => setIsImageVisible(!isImageVisible)} className="flex justify-between items-center w-full group">
            <h3 className="text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><ImageIcon size={16} /></div>
              Matriz Visual Analisada
            </h3>
            {isImageVisible ? <ChevronUp className="text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" /> : <ChevronDown className="text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" />}
          </button>

          {isImageVisible && (
            <div className="mt-8 relative group/img animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--accent)/0.1)] to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>
              <img src={analysis.image_url} alt={analysis.title} className="rounded-2xl w-full border border-[hsl(var(--border))] shadow-2xl transition-transform duration-700 group-hover/img:scale-[1.01]" />
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <button onClick={() => setIsAnalysisVisible(!isAnalysisVisible)} className="flex items-center gap-4 group text-left">
              <div className="p-3 bg-[hsl(var(--accent)/0.1)] rounded-2xl text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)]">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[hsl(var(--text-bright))] uppercase tracking-widest">Auditoria Neural</h3>
                <p className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em]">Resultado completo da avaliação IA</p>
              </div>
              {isAnalysisVisible ? <ChevronUp className="ml-2 text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" /> : <ChevronDown className="ml-2 text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" />}
            </button>
            <button onClick={() => generatePDF(analysis)} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-[hsl(var(--border))] transition-all active:scale-95 flex items-center gap-3 shadow-xl">
              <Download size={16} /> Exportar Dossiê PDF
            </button>
          </div>

          {isAnalysisVisible && (
            <div className="glass-premium bg-[hsl(var(--bg-card))] rounded-[2.5rem] p-10 border-2 border-[hsl(var(--border))] shadow-2xl animate-in fade-in slide-in-from-top-6 duration-700 relative overflow-visible">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <MessageSquare size={120} />
              </div>

              <div className="relative z-10">
                <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:uppercase prose-headings:tracking-tighter prose-hr:border-[hsl(var(--border))]">
                  {parsedContent.before}
                </div>
                {parsedContent.table && (
                  <div className="my-12">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                      Mapeamento de Desvios
                    </h3>
                    {parsedContent.table}
                  </div>
                )}
                <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:uppercase prose-headings:tracking-tighter prose-hr:border-[hsl(var(--border))]">
                  {parsedContent.after}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
        <div>
          <h2 className="text-4xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-[hsl(var(--accent)/0.1)] rounded-2xl border border-[hsl(var(--accent)/0.2)]">
              <FileEdit className="text-[hsl(var(--accent))]" size={32} />
            </div>
            Corretor de Discursiva
          </h2>
          <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mt-3 ml-1">Análise Neural de Redações e Peças Técnicas</p>
        </div>
        <button onClick={() => setShowSql(true)} className="px-6 py-3 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] text-[10px] font-black uppercase tracking-widest rounded-2xl border border-[hsl(var(--border))] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg">
          <Database size={16} /> Configurar Neural DB
        </button>
      </div>

      <div className="glass-premium bg-yellow-500/5 border border-yellow-500/20 p-5 rounded-[1.5rem] text-yellow-500/80 flex items-center gap-4 animate-in fade-in transition-all hover:bg-yellow-500/10 hover:border-yellow-500/40">
        <div className="p-2 bg-yellow-500/20 rounded-xl"><AlertTriangle size={20} /></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Protocolo Experimental: A precisão neural pode variar conforme a caligrafia.</span>
      </div>

      <div className="flex p-1 bg-[hsl(var(--bg-sidebar)/0.5)] backdrop-blur-md border border-[hsl(var(--border))] rounded-2xl shadow-xl w-fit">
        <button onClick={() => { setActiveTab('new'); setSelectedHistory(null); }} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'new' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-[0_0_20px_hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-white/5'}`}>Injetar Redação</button>
        <button onClick={() => { setActiveTab('history'); setSelectedHistory(null); }} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-[0_0_20px_hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-white/5'}`}>Arquivo de Memória ({history.length})</button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3"><AlertTriangle /> {error}</div>}

      {/* TELA DE NOVA ANÁLISE */}
      {activeTab === 'new' && !selectedHistory && (
        <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in relative overflow-visible">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <UploadCloud size={160} className="text-[hsl(var(--accent))]" />
          </div>

          {!geminiKeyAvailable && (
            <div className="mb-10 p-6 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-4 animate-pulse">
              <AlertTriangle size={24} />
              <span className="text-xs font-black uppercase tracking-widest">Interface Neural Desconectada: Insira sua Chave de API nas configurações do sistema.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start relative z-10">
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-black text-[hsl(var(--text-bright))] uppercase tracking-widest mb-2">1. Preparar Matriz</h3>
                <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em]">Identifique o tema e o contexto da redação</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Título da Redação</label>
                  <input type="text" placeholder="Ex: A Crise do Sistema Penitenciário..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-5 text-sm text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Contexto / Enunciado (Opcional)</label>
                  <textarea placeholder="Cole aqui o texto motivador ou a pergunta da banca para uma análise cirúrgica..." value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-5 text-sm text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none h-40 transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner resize-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Capturar Imagem da Prova</label>
                <div className="h-80 border-2 border-dashed border-[hsl(var(--border))] rounded-[2rem] flex flex-col items-center justify-center text-[hsl(var(--text-muted))] relative hover:border-[hsl(var(--accent))] transition-all bg-[hsl(var(--bg-user-block)/0.3)] group overflow-hidden">
                  {filePreview ? (
                    <div className="relative w-full h-full p-4">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
                      <button onClick={() => { setFile(null); setFilePreview(null); }} className="absolute top-6 right-6 bg-red-500 p-3 rounded-full text-white hover:bg-red-600 transition-all shadow-xl active:scale-95"><X size={20} /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 transition-transform group-hover:scale-110">
                      <div className="p-6 bg-[hsl(var(--bg-user-block))] rounded-[2rem] border border-[hsl(var(--border))] text-[hsl(var(--accent))] shadow-xl">
                        <UploadCloud size={48} />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--text-bright))]">Injetar Arquivo Visual</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] mt-1">PNG, JPG, WEBP • MÁX 10MB</p>
                      </div>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-black text-[hsl(var(--text-bright))] uppercase tracking-widest mb-2">2. Iniciar Auditoria Neural</h3>
                <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em]">A IA analisará cada pixel da sua escrita</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Sparkles, label: "8 Critérios", desc: "Avaliação técnica completa" },
                  { icon: Database, label: "Persistent", desc: "Histórico blindado no DB" },
                  { icon: Download, label: "PDF Premium", desc: "Exportação de luxo" },
                  { icon: List, label: "Plano de Ação", desc: "Estratégia de melhoria" }
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-[hsl(var(--bg-user-block)/0.4)] border border-[hsl(var(--border))] rounded-2xl flex flex-col gap-3 transition-all hover:bg-[hsl(var(--bg-user-block)/0.6)]">
                    <item.icon size={20} className="text-[hsl(var(--accent))]" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-bright))]">{item.label}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))]">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="pt-8">
                <button onClick={handleAnalyze} disabled={isLoading || !geminiKeyAvailable} className={`w-full flex items-center justify-center gap-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.3em] py-8 rounded-[2rem] shadow-2xl shadow-cyan-500/20 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-95 text-[11px] border border-white/10`}>
                  {isLoading ? <><Loader2 className="animate-spin" size={24} /> Processando Matriz Digital...</> : <><Sparkles size={24} /> Ativar Redes Neurais</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE HISTÓRICO */}
      {activeTab === 'history' && !selectedHistory && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-[hsl(var(--accent))]" size={40} />
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em]">Acessando Registros Neurais...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-24 border-2 border-dashed border-[hsl(var(--border))] rounded-[2rem] text-center bg-[hsl(var(--bg-user-block))/0.2]">
              <Database size={48} className="mx-auto text-[hsl(var(--text-muted))] opacity-20 mb-6" />
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum histórico de discursivas indexado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map(item => (
                <div key={item.id} className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2rem] p-6 flex flex-col justify-between group hover:border-[hsl(var(--accent)/0.5)] transition-all cursor-pointer relative overflow-hidden" onClick={() => setSelectedHistory(item)}>
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-[hsl(var(--accent)/0.03)] rounded-full blur-2xl group-hover:bg-[hsl(var(--accent)/0.1)] transition-all"></div>

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-lg font-black text-[hsl(var(--text-bright))] truncate uppercase tracking-tight group-hover:text-[hsl(var(--accent))] transition-colors leading-tight">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest bg-[hsl(var(--bg-user-block))] w-fit px-3 py-1 rounded-full border border-[hsl(var(--border))]">
                        <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-[hsl(var(--bg-user-block))] p-4 rounded-2xl border border-[hsl(var(--border))] text-center min-w-[80px] shadow-lg">
                      <div className="text-xl font-black text-[hsl(var(--accent))] leading-none">{extractFinalScore(item.analysis_text)}</div>
                      <div className="text-[8px] text-[hsl(var(--text-muted))] uppercase font-bold mt-1 tracking-widest">Score</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[hsl(var(--border))]">
                    <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest flex items-center gap-2">
                      <Database size={12} /> ID: {item.id.substring(0, 8)}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-3 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl text-red-500 border border-red-500/10 transition-all active:scale-90">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TELA DE VISUALIZAÇÃO DE ANÁLISE (NOVA OU DO HISTÓRICO) */}
      {selectedHistory && (
        <div className="animate-in fade-in">
          <button
            onClick={() => setSelectedHistory(null)}
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-bright)] mb-6 transition-colors group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform text-[var(--accent)]" />
            Voltar para o Histórico
          </button>
          <AnalysisView analysis={selectedHistory} />
        </div>
      )}

      {/* MODAL SQL */}
      {showSql && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 relative">
            <button onClick={() => setShowSql(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X /></button>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-yellow-400"><Database /> Script de Configuração</h3>
            <p className="text-sm text-slate-300 mb-4">Execute este código no seu <strong className="text-white">Supabase SQL Editor</strong> para habilitar o armazenamento e a tabela de discursivas.</p>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-64 overflow-y-auto relative">
              <pre className="whitespace-pre-wrap">{SQL_SCRIPT}</pre>
              <button onClick={() => navigator.clipboard.writeText(SQL_SCRIPT)} className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-cyan-600 rounded-lg"><Copy size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discursiva;