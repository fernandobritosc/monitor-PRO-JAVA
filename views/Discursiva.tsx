import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { GoogleGenAI } from "@google/genai";
import { Discursiva as DiscursivaType } from '../types';
import { 
  FileEdit, UploadCloud, Loader2, Sparkles, Download, Database, Copy, X, Trash2, Image as ImageIcon, MessageSquare, List, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft
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

      const ai = new GoogleGenAI({ apiKey: getGeminiKey()! });
      const imagePart = await fileToGenerativePart(file);

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
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, {text: finalPrompt}] },
        config: {
          temperature: 0.4, // Reduz a aleatoriedade para maior consistência
        }
      });
      
      const analysisText = response.text || "A IA não retornou uma análise.";

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
            if(fileName && user) {
                await supabase.storage.from('discursivas_images').remove([`${user.id}/${fileName}`]);
            }
        }
        const { error } = await supabase.from('discursivas').delete().eq('id', id);
        if (error) throw error;
        setHistory(prev => prev.filter(item => item.id !== id));
        if(selectedHistory?.id === id) setSelectedHistory(null);
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
                const actionsText = categories[i+1] || '';
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
      if(finalMatch) {
         if (currentY > 250) { doc.addPage(); currentY = 20; }
         (doc as any).autoTable({
            startY: currentY,
            body: [
              [{ content: 'Nota Final', styles: { fontStyle: 'bold' } }, { content: finalMatch[1].trim(), styles: { fontStyle: 'bold', fontSize: 14, halign: 'center' }}],
              [{ content: 'Comentário Geral', styles: { fontStyle: 'bold' } }, finalMatch[2].trim()]
            ],
            theme: 'grid',
            styles: { fontSize: 9 }
         });
      }

      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado via MonitorPro - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`Analise_Discursiva_${analysis.id.substring(0,8)}.pdf`);
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
          <div className="my-4 p-4 bg-slate-950/30 rounded-lg border border-slate-700 text-slate-500 italic text-sm">
            Nenhum desvio gramatical significativo foi encontrado pela IA.
          </div>
        );
      }
      return (
        <div className="overflow-x-auto my-4 bg-slate-950/30 rounded-lg border border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                {tableData.header.map((h: string) => <th key={h} className="p-3 text-xs font-bold uppercase text-slate-400">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableData.body.map((row: string[], rowIndex: number) => (
                <tr key={rowIndex} className="border-b border-slate-700 last:border-0 hover:bg-white/5">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-3 text-sm text-slate-300 font-mono">{cell.replace(/"/g, '')}</td>
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
          .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-cyan-400 mt-6 mb-3">$1</h2>')
          .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^---$/gim, '<hr class="my-6 border-slate-700">')
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
      <div className="space-y-6 animate-in fade-in">
        {analysis.prompt && (
          <div className="glass rounded-xl p-4">
            <h3 className="font-bold text-white flex items-center gap-2 mb-2"><List size={16} className="text-slate-400" /> Enunciado da Questão</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-white/5">{analysis.prompt}</p>
          </div>
        )}
        <div className="glass rounded-xl p-4">
          <button onClick={() => setIsImageVisible(!isImageVisible)} className="flex justify-between items-center w-full group">
            <h3 className="font-bold text-white flex items-center gap-2"><ImageIcon size={16} className="text-slate-400" /> Imagem da Redação</h3>
            {isImageVisible ? <ChevronUp className="text-slate-400 group-hover:text-white" /> : <ChevronDown className="text-slate-400 group-hover:text-white" />}
          </button>
          {isImageVisible && (
            <div className="mt-4 p-2 bg-black/20 rounded-lg animate-in fade-in slide-in-from-top-2">
              <img src={analysis.image_url} alt={analysis.title} className="rounded-lg w-full max-w-2xl mx-auto" />
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <button onClick={() => setIsAnalysisVisible(!isAnalysisVisible)} className="flex-1 flex justify-between items-center group text-left min-w-0 pr-4">
              <h3 className="font-bold text-white flex items-center gap-2 truncate">
                <MessageSquare size={16} className="text-slate-400" />
                Análise da IA
              </h3>
              {isAnalysisVisible ? <ChevronUp className="text-slate-400 group-hover:text-white shrink-0" /> : <ChevronDown className="text-slate-400 group-hover:text-white shrink-0" />}
            </button>
            <button onClick={() => generatePDF(analysis)} className="shrink-0 flex items-center gap-2 text-xs bg-slate-800 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg transition-colors">
              <Download size={14} /> Baixar PDF
            </button>
          </div>
          {isAnalysisVisible && (
            <div className="glass rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-li:my-1" style={{ '--tw-prose-invert-body': '#d1d5db' } as React.CSSProperties}>
                  {parsedContent.before}
                </div>
                {parsedContent.table && (
                  <>
                    <h3 className="text-lg font-bold text-white mt-6 mb-3">Tabela de Desvios Gramaticais</h3>
                    {parsedContent.table}
                  </>
                )}
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-li:my-1" style={{ '--tw-prose-invert-body': '#d1d5db' } as React.CSSProperties}>
                  {parsedContent.after}
                </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
             <FileEdit /> Corretor de Discursiva
          </h2>
          <p className="text-slate-400 text-sm mt-1">Envie sua redação e receba uma análise detalhada pela IA.</p>
        </div>
        <button onClick={() => setShowSql(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/20 flex items-center gap-2"><Database size={14} /> Permissões (SQL)</button>
      </div>

      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 flex items-center gap-3 animate-in fade-in">
        <AlertTriangle/> 
        <span><strong>Atenção:</strong> Esta funcionalidade está em desenvolvimento. Análises podem conter imprecisões.</span>
      </div>

      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/10 self-start">
        <button onClick={() => { setActiveTab('new'); setSelectedHistory(null); }} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'new' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>Nova Análise</button>
        <button onClick={() => { setActiveTab('history'); setSelectedHistory(null); }} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>Histórico ({history.length})</button>
      </div>
      
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3"><AlertTriangle/> {error}</div>}

      {/* TELA DE NOVA ANÁLISE */}
      {activeTab === 'new' && !selectedHistory && (
        <div className="glass p-8 rounded-2xl animate-in fade-in">
          {!geminiKeyAvailable && <div className="p-4 mb-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 flex items-center gap-3"><AlertTriangle/> A funcionalidade de IA está desativada. Por favor, insira sua chave da API Gemini na aba "Sistema" em Configurações.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h3 className="font-bold text-lg">1. Envie sua Redação</h3>
              <input type="text" placeholder="Digite o tema da redação..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50" />
              <textarea placeholder="Cole aqui o enunciado da questão (opcional, mas recomendado)" value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 h-24 text-sm" />
              <div className="h-64 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 relative hover:border-cyan-500 transition-all">
                {filePreview ? (
                    <>
                        <img src={filePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                        <button onClick={() => { setFile(null); setFilePreview(null); }} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-red-500"><X size={16}/></button>
                    </>
                ) : (
                    <>
                        <UploadCloud size={32}/>
                        <p className="mt-2 text-sm font-medium">Arraste ou clique para enviar a imagem</p>
                        <p className="text-xs">PNG, JPG, WEBP. Máx 10MB.</p>
                    </>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-lg">2. Iniciar Análise</h3>
              <div className="bg-slate-900/30 p-4 rounded-xl space-y-2 text-xs text-slate-400">
                <p>✅ A IA analisará 8 critérios de correção.</p>
                <p>✅ A imagem e a análise ficarão salvas no seu histórico.</p>
                <p>✅ Você poderá baixar um PDF da correção.</p>
              </div>
              <button onClick={handleAnalyze} disabled={isLoading || !geminiKeyAvailable} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all">
                {isLoading ? <><Loader2 className="animate-spin"/> Analisando...</> : <><Sparkles/> Analisar com IA</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE HISTÓRICO */}
        {activeTab === 'history' && !selectedHistory && (
            <div className="animate-in fade-in">
            {loadingHistory ? <Loader2 className="animate-spin mx-auto text-white"/> : history.length === 0 ? <p className="text-slate-500 text-center py-10">Nenhuma análise encontrada.</p> : (
                <div className="space-y-2">
                    {history.map(item => (
                        <div key={item.id} className="glass rounded-xl p-4 flex justify-between items-center group hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setSelectedHistory(item)}>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white truncate">{item.title}</h4>
                                <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                <div className="text-lg font-bold text-cyan-400">{extractFinalScore(item.analysis_text)}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Nota Final</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 bg-slate-800 rounded-full text-slate-500 opacity-20 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={16}/></button>
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
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white mb-6 transition-colors group"
              >
                  <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  Voltar para o Histórico
              </button>
              <AnalysisView analysis={selectedHistory} />
          </div>
      )}

      {/* MODAL SQL */}
      {showSql && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 relative">
               <button onClick={() => setShowSql(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X/></button>
               <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-yellow-400"><Database/> Script de Configuração</h3>
               <p className="text-sm text-slate-300 mb-4">Execute este código no seu <strong className="text-white">Supabase SQL Editor</strong> para habilitar o armazenamento e a tabela de discursivas.</p>
               <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-64 overflow-y-auto relative">
                  <pre className="whitespace-pre-wrap">{SQL_SCRIPT}</pre>
                  <button onClick={() => navigator.clipboard.writeText(SQL_SCRIPT)} className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-cyan-600 rounded-lg"><Copy size={14}/></button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Discursiva;
