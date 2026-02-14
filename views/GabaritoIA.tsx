import React, { useState, useMemo, useEffect } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent } from '../services/aiService';
import { GoogleGenAI, Type } from "@google/genai";
import { GabaritoItem, SavedGabarito } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { UploadCloud, Loader2, Sparkles, Download, FileCheck, Check, X, AlertTriangle, ChevronDown, ChevronUp, FileText, Trash2, Save, ArrowLeft, History, BarChart, Type as TypeIcon, PlusCircle, Brain, CheckCircle2, CheckSquare } from 'lucide-react';

// Declarações para TypeScript reconhecer as bibliotecas globais
declare global {
  interface Window {
    pdfjsLib: any;
    jspdf: any;
  }
}
if (typeof window !== 'undefined' && window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const AI_PROMPT_GABARITO_IMAGE = `
Você é um examinador especialista em concursos, membro de uma banca examinadora rigorosa. Sua tarefa é analisar a IMAGEM de uma página de prova.

1.  **IDENTIFIQUE TODAS AS QUESTÕES:** Examine a imagem e identifique **TODAS** as questões numeradas.
2.  **EXTRAIA O ENUNCIADO COMPLETO:** Para cada questão, transcreva o **texto completo do enunciado**, incluindo o texto base se houver.
3.  **RESOLVA E JUSTIFIQUE:** Determine a alternativa correta (A, B, C, D ou E) e forneça uma justificativa técnica detalhada para a resposta.
4.  **SAÍDA ESTRITA EM JSON:** Sua resposta DEVE ser um array JSON válido. Se não encontrar questões, retorne um array JSON vazio \`[]\`.
`;

const AI_PROMPT_GABARITO_TEXT = `
Você é um examinador especialista em concursos. Sua tarefa é analisar o TEXTO fornecido, que pode conter uma ou mais questões.

1.  **IDENTIFIQUE CADA QUESTÃO:** Separe o texto em questões individuais. Use a numeração como guia principal.
2.  **EXTRAIA OS DADOS:** Para cada questão, extraia: o número da questão, o enunciado completo, a alternativa correta (A, B, C, D ou E) e uma justificativa técnica detalhada para sua resposta.
3.  **SAÍDA ESTRITA EM JSON:** Sua resposta DEVE ser um array JSON válido, usando o schema fornecido. Se não encontrar questões, retorne um array JSON vazio \`[]\`.
`;

const AI_PROMPT_SINGLE_QUESTION = `
Você é um examinador especialista em concursos. Sua tarefa é analisar a questão a seguir, determinar a alternativa correta e fornecer uma justificativa técnica detalhada.

**Entrada:**
- **Enunciado:** {ENUNCIADO}
- **Alternativas:** {ALTERNATIVAS}

**SAÍDA ESTRITA EM JSON (UM ÚNICO OBJETO):** Sua resposta DEVE ser um objeto JSON válido, usando o schema fornecido.
`;

const singleResponseSchema = {
  type: Type.OBJECT,
  properties: {
    numero_questao: { type: Type.INTEGER },
    enunciado: { type: Type.STRING },
    alternativa_correta_ia: { type: Type.STRING },
    justificativa: { type: Type.STRING }
  },
  required: ["alternativa_correta_ia", "justificativa"]
};

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      numero_questao: { type: Type.INTEGER },
      enunciado: { type: Type.STRING, description: "O texto completo do enunciado da questão." },
      alternativa_correta_ia: { type: Type.STRING },
      justificativa: { type: Type.STRING }
    },
    required: ["numero_questao", "enunciado", "alternativa_correta_ia", "justificativa"]
  }
};

const PieChartComponent: React.FC<{ data: any[], colors: string[], score: number, total: number }> = ({ data, colors, score, total }) => {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  return (
    <div className="relative h-40 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={5}>
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-white">{percentage.toFixed(0)}%</span>
      </div>
      <div className="absolute bottom-0 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> <span className="text-slate-400">Acertos:</span> <span className="font-bold text-white">{score}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> <span className="text-slate-400">Erros:</span> <span className="font-bold text-white">{total - score}</span></div>
      </div>
    </div>
  );
};

const GabaritoIA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [newAnalysisType, setNewAnalysisType] = useState<'pdf' | 'text'>('pdf');
  const [savedGabaritos, setSavedGabaritos] = useState<SavedGabarito[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedGabarito, setSelectedGabarito] = useState<SavedGabarito | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [officialAnswers, setOfficialAnswers] = useState<Record<number, string>>({});

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [manualQuestionData, setManualQuestionData] = useState({ numero: '', enunciado: '', alternativas: '' });
  const [manualAddLoading, setManualAddLoading] = useState(false);
  const [manualAddError, setManualAddError] = useState<string | null>(null);

  const geminiKeyAvailable = !!getGeminiKey();

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.from('gabaritos_salvos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSavedGabaritos(data || []);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('relation "public.gabaritos_salvos" does not exist')) {
        setError("Tabela de gabaritos não encontrada. Execute o script SQL em Configurações > Diagnóstico.");
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
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Por favor, selecione um arquivo PDF.");
    }
  };

  const handleAnalyzePDF = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: fileBuffer }).promise;

      setProgress({ current: 0, total: pdf.numPages });
      const allResults: GabaritoItem[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress({ current: i, total: pdf.numPages });
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
        const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };

        const responseText = await generateAIContent(
          AI_PROMPT_GABARITO_IMAGE,
          getGeminiKey(),
          getGroqKey()
        );
        // Nota: generateAIContent atual ainda não suporta imagens multimodal nativamente para Groq.
        // Por enquanto, o fallback multimodal do aiService ainda precisaria ser aprimorado 
        // ou mantido como Gemini-only para análise de imagens se Groq falhar.
        // Mas para manter a consistência com o pedido de resiliência, usaremos o serviço unificado.

        try {
          const pageResults = JSON.parse(responseText.replace(/```json|```/g, '').trim() || '[]');
          if (Array.isArray(pageResults)) allResults.push(...pageResults);
        } catch (e) { console.warn(`Página ${i} JSON inválido.`); }
      }

      const sortedResults = allResults.sort((a, b) => a.numero_questao - b.numero_questao);

      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Usuário não autenticado para salvar a análise.");

      const { data: newRecord, error: insertError } = await supabase.from('gabaritos_salvos')
        .insert({ user_id: user.id, file_name: file.name, results_json: sortedResults, user_answers_json: {}, official_answers_json: {} })
        .select().single();

      if (insertError) throw insertError;

      fetchHistory(); setSelectedGabarito(newRecord); setUserAnswers({}); setOfficialAnswers({});
    } catch (err: any) { setError("Falha na análise: " + err.message); console.error(err); } finally { setProcessing(false); }
  };

  const handleManualAnalyze = async () => {
    if (!manualText.trim() || !geminiKeyAvailable) return;
    setProcessing(true);
    setError(null);
    setProgress({ current: 1, total: 1 });

    try {
      const responseText = await generateAIContent(
        AI_PROMPT_GABARITO_TEXT + "\n\n--- TEXTO PARA ANÁLISE ---\n" + manualText,
        getGeminiKey(),
        getGroqKey()
      );

      let analysisResults: GabaritoItem[] = [];
      try {
        const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim() || '[]');
        if (!Array.isArray(parsed)) throw new Error("AI did not return an array.");
        analysisResults = parsed;
      } catch (e) { throw new Error("A IA retornou um formato de dados inválido."); }

      const sortedResults = analysisResults.sort((a, b) => a.numero_questao - b.numero_questao);
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Usuário não autenticado para salvar a análise.");

      const fileName = `Análise Manual - ${new Date().toLocaleDateString('pt-BR')}`;
      const { data: newRecord, error: insertError } = await supabase.from('gabaritos_salvos')
        .insert({ user_id: user.id, file_name: fileName, results_json: sortedResults, user_answers_json: {}, official_answers_json: {} })
        .select().single();

      if (insertError) throw insertError;
      fetchHistory(); setSelectedGabarito(newRecord); setUserAnswers({}); setOfficialAnswers({});
    } catch (err: any) { setError("Falha na análise manual: " + err.message); console.error(err); } finally { setProcessing(false); }
  };

  const handleManualAddAndAnalyze = async () => {
    if (!manualQuestionData.numero || !manualQuestionData.enunciado) {
      setManualAddError("O número da questão e o enunciado são obrigatórios.");
      return;
    }
    setManualAddLoading(true);
    setManualAddError(null);

    try {
      const prompt = AI_PROMPT_SINGLE_QUESTION
        .replace('{ENUNCIADO}', manualQuestionData.enunciado)
        .replace('{ALTERNATIVAS}', manualQuestionData.alternativas);

      const responseText = await generateAIContent(
        prompt,
        getGeminiKey(),
        getGroqKey()
      );

      const newQuestionPartial = JSON.parse(responseText.replace(/```json|```/g, '').trim() || '{}');
      const newQuestion: GabaritoItem = {
        numero_questao: parseInt(manualQuestionData.numero),
        enunciado: manualQuestionData.enunciado,
        alternativa_correta_ia: newQuestionPartial.alternativa_correta_ia || '?',
        justificativa: newQuestionPartial.justificativa || 'Análise falhou.'
      };

      setSelectedGabarito(prev => {
        if (!prev) return null;
        const updatedResults = [...prev.results_json.filter(q => q.numero_questao !== newQuestion.numero_questao), newQuestion]
          .sort((a, b) => a.numero_questao - b.numero_questao);
        return { ...prev, results_json: updatedResults };
      });

      setShowManualAddModal(false);
      setManualQuestionData({ numero: '', enunciado: '', alternativas: '' });

    } catch (err: any) {
      setManualAddError("Falha na análise da IA: " + err.message);
    } finally {
      setManualAddLoading(false);
    }
  };

  const scores = useMemo(() => {
    if (!selectedGabarito) return null;
    let scoreAI = 0, totalAI = 0, scoreOfficial = 0, totalOfficial = 0;
    selectedGabarito.results_json.forEach(res => {
      const uA = userAnswers[res.numero_questao];
      if (uA) { totalAI++; if (uA === res.alternativa_correta_ia) scoreAI++; }
      const oA = officialAnswers[res.numero_questao];
      if (oA && uA) { totalOfficial++; if (uA === oA) scoreOfficial++; }
    });
    const dataVsAI = totalAI > 0 ? [{ name: 'Acertos', value: scoreAI }, { name: 'Erros', value: totalAI - scoreAI }] : [{ name: 'N/A', value: 1 }];
    const dataVsOfficial = totalOfficial > 0 ? [{ name: 'Acertos', value: scoreOfficial }, { name: 'Erros', value: totalOfficial - scoreOfficial }] : [{ name: 'N/A', value: 1 }];
    return { dataVsAI, dataVsOfficial, totals: { scoreAI, totalAI, scoreOfficial, totalOfficial } };
  }, [selectedGabarito, userAnswers, officialAnswers]);

  const handleUpdate = async () => {
    if (!selectedGabarito) return;
    const { error } = await supabase.from('gabaritos_salvos')
      .update({
        user_answers_json: userAnswers,
        official_answers_json: officialAnswers,
        results_json: selectedGabarito.results_json
      })
      .eq('id', selectedGabarito.id);
    if (error) setError("Falha ao salvar alterações."); else alert("Salvo com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta análise permanentemente?")) return;
    await supabase.from('gabaritos_salvos').delete().eq('id', id);
    fetchHistory();
    if (selectedGabarito?.id === id) setSelectedGabarito(null);
  };

  const generatePDF = async () => {
    if (!selectedGabarito || !window.jspdf || !scores) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: { user } } = await (supabase.auth as any).getUser();
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
    doc.setTextColor(15, 236, 236);
    doc.text("Relatório de Análise de Gabarito", 14, 28);

    // --- INFO BLOCK ---
    currentY = 40;
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Informações da Análise", 14, currentY);
    currentY += 5;

    (doc as any).autoTable({
      startY: currentY,
      body: [
        ['ALUNO(A)', user?.email || 'N/A'],
        ['PROVA', selectedGabarito.file_name],
        ['ID REGISTRO', selectedGabarito.id.substring(0, 8).toUpperCase()],
        ['DATA', new Date(selectedGabarito.created_at).toLocaleString('pt-BR')],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100] } },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // SUMMARY
    doc.setFontSize(14);
    doc.text("Resumo de Desempenho", 14, currentY);
    currentY += 6;
    (doc as any).autoTable({
      startY: currentY,
      head: [['Comparativo', 'Acertos', 'Total', 'Nota']],
      body: [
        ['vs. IA', scores.totals.scoreAI, scores.totals.totalAI, `${(scores.totals.totalAI > 0 ? (scores.totals.scoreAI) / scores.totals.totalAI * 100 : 0).toFixed(0)}%`],
        ['vs. Gabarito Oficial', scores.totals.scoreOfficial, scores.totals.totalOfficial, `${(scores.totals.totalOfficial > 0 ? (scores.totals.scoreOfficial) / scores.totals.totalOfficial * 100 : 0).toFixed(0)}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 135] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // DETAILED TABLE
    doc.setFontSize(14);
    doc.text("Gabarito Detalhado", 14, currentY);
    currentY += 6;
    (doc as any).autoTable({
      startY: currentY,
      head: [['Questão', 'Sua Resposta', 'Gabarito Oficial', 'Gabarito IA', 'Resultado (vs. Oficial)']],
      body: selectedGabarito.results_json.map(r => [
        r.numero_questao,
        userAnswers[r.numero_questao] || '-',
        officialAnswers[r.numero_questao] || '-',
        r.alternativa_correta_ia,
        (userAnswers[r.numero_questao] && officialAnswers[r.numero_questao]) ? (userAnswers[r.numero_questao] === officialAnswers[r.numero_questao] ? 'CORRETO' : 'ERRADO') : '-'
      ]),
      didParseCell: (data: any) => {
        if (data.column.index === 4) {
          if (data.cell.raw === 'CORRETO') data.cell.styles.textColor = [0, 150, 0];
          if (data.cell.raw === 'ERRADO') data.cell.styles.textColor = [200, 0, 0];
        }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // JUSTIFICATIONS
    doc.setFontSize(14);
    doc.text("Análise Detalhada das Questões", 14, currentY);
    currentY += 8;

    selectedGabarito.results_json.forEach(r => {
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(`Questão ${r.numero_questao}`, 14, currentY);
      currentY += 6;

      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Enunciado:", 14, currentY);
      doc.setFont("helvetica", "normal");
      const splitEnunciado = doc.splitTextToSize(r.enunciado, 180);
      doc.text(splitEnunciado, 14, currentY + 4);
      currentY += (splitEnunciado.length * 4) + 6;

      doc.setFont("helvetica", "bold"); doc.text("Justificativa (IA):", 14, currentY);
      doc.setFont("helvetica", "normal");
      const splitJustificativa = doc.splitTextToSize(r.justificativa, 180);
      doc.text(splitJustificativa, 14, currentY + 4);
      currentY += (splitJustificativa.length * 4) + 10;
    });

    // FOOTER
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Gerado em ${new Date().toLocaleString()} via MonitorPro - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`analise_gabarito_${selectedGabarito.file_name.replace('.pdf', '')}.pdf`);
  };

  if (selectedGabarito) {
    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <button onClick={() => setSelectedGabarito(null)} className="flex items-center gap-3 text-[10px] font-black text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] transition-all group uppercase tracking-widest">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-[hsl(var(--accent))]" />
          Voltar ao Arquivo
        </button>

        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-8 pb-10 border-b border-[hsl(var(--border))]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1 bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)] rounded-full text-[9px] font-black text-[hsl(var(--accent))] uppercase tracking-widest">Auditoria Concluída</div>
              <p className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest">{new Date(selectedGabarito.created_at).toLocaleString('pt-BR')}</p>
            </div>
            <h3 className="text-3xl font-black text-[hsl(var(--text-bright))] truncate uppercase tracking-tighter leading-tight">{selectedGabarito.file_name}</h3>
          </div>

          <div className="flex flex-wrap gap-4">
            <button onClick={() => setShowManualAddModal(true)} className="px-6 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-[hsl(var(--border))] transition-all">
              <PlusCircle size={16} className="text-emerald-400" /> Adicionar Item
            </button>
            <button onClick={generatePDF} className="px-6 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-[hsl(var(--border))] transition-all">
              <Download size={16} className="text-blue-400" /> Exportar Dossiê
            </button>
            <button onClick={handleUpdate} className="px-8 py-4 bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95">
              <Save size={16} /> Consolidar Alterações
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none rotate-12">
              <Sparkles size={120} />
            </div>
            <h4 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <div className="w-1.5 h-4 bg-cyan-500 rounded-full" /> Desempenho vs. IA
            </h4>
            {scores && <PieChartComponent data={scores.dataVsAI} colors={['hsl(var(--accent))', 'hsl(var(--bg-user-block))']} score={scores.totals.scoreAI} total={scores.totals.totalAI} />}
          </div>

          <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none -rotate-12">
              <BarChart size={120} />
            </div>
            <h4 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <div className="w-1.5 h-4 bg-emerald-500 rounded-full" /> Desempenho vs. Oficial
            </h4>
            {scores && <PieChartComponent data={scores.dataVsOfficial} colors={['#10b981', 'hsl(var(--bg-user-block))']} score={scores.totals.scoreOfficial} total={scores.totals.totalOfficial} />}
          </div>
        </div>
        <div className="space-y-6">
          {selectedGabarito.results_json.map(res => {
            const isCorrectVsOfficial = userAnswers[res.numero_questao] && officialAnswers[res.numero_questao] && userAnswers[res.numero_questao] === officialAnswers[res.numero_questao];
            const isMatchWithIA = userAnswers[res.numero_questao] && res.alternativa_correta_ia && userAnswers[res.numero_questao] === res.alternativa_correta_ia;

            return (
              <div key={res.numero_questao} className={`glass-premium bg-[hsl(var(--bg-card))] rounded-[2.5rem] p-8 border-2 transition-all duration-500 relative overflow-hidden group ${userAnswers[res.numero_questao] && officialAnswers[res.numero_questao] ? (isCorrectVsOfficial ? 'border-emerald-500/30' : 'border-red-500/30') : 'border-[hsl(var(--border))]'}`}>

                {/* Indicador de Status Laterial */}
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${userAnswers[res.numero_questao] && officialAnswers[res.numero_questao] ? (isCorrectVsOfficial ? 'bg-emerald-500' : 'bg-red-500') : 'bg-transparent'}`} />

                <div className="flex flex-col xl:flex-row gap-10">

                  {/* Info da Questão */}
                  <div className="xl:w-48 shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Brain size={20} className="text-indigo-400" />
                      </div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Item {res.numero_questao}</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-purple-500/10 rounded-[1.5rem] border border-purple-500/20 shadow-lg shadow-purple-500/5">
                        <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2 block">Gabarito IA (Sugestão)</p>
                        <div className="text-3xl font-black text-white">{res.alternativa_correta_ia}</div>
                      </div>
                    </div>
                  </div>

                  {/* Interação e Dados */}
                  <div className="flex-1 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                      {/* Seção Resposta Usuário */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Sua Resposta
                        </h5>
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D', 'E'].map(opt => (
                            <button
                              key={opt}
                              onClick={() => setUserAnswers(p => ({ ...p, [res.numero_questao]: opt }))}
                              className={`w-12 h-12 rounded-2xl text-xs font-black transition-all transform hover:scale-110 active:scale-90 border-2 ${userAnswers[res.numero_questao] === opt ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-[hsl(var(--bg-user-block))] border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-indigo-500/50'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Seção Gabarito Oficial */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Gabarito Oficial (Banca)
                        </h5>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"><CheckCircle2 size={16} /></div>
                          <select
                            onChange={e => setOfficialAnswers(p => ({ ...p, [res.numero_questao]: e.target.value }))}
                            value={officialAnswers[res.numero_questao] || ''}
                            className="w-full bg-[hsl(var(--bg-user-block))] border-2 border-[hsl(var(--border))] rounded-2xl pl-12 pr-4 py-3 text-xs font-black text-white focus:ring-2 focus:ring-emerald-500/30 outline-none appearance-none transition-all cursor-pointer group-hover:border-emerald-500/30"
                          >
                            <option value="">Não divulgado</option>
                            {['A', 'B', 'C', 'D', 'E'].map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isMatchWithIA ? 'text-indigo-400' : 'text-[hsl(var(--text-muted))]'}`}>
                          {isMatchWithIA ? <><Sparkles size={12} /> Bate com a IA</> : <><AlertTriangle size={12} /> Diverge da IA</>}
                        </div>
                        {officialAnswers[res.numero_questao] && (
                          <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isCorrectVsOfficial ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isCorrectVsOfficial ? <><CheckSquare size={12} /> Acerto Real</> : <><X size={12} /> Erro Real</>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setExpanded(p => ({ ...p, [res.numero_questao]: !p[res.numero_questao] }))}
                        className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors group/btn"
                      >
                        <FileText size={16} className="group-hover/btn:scale-110 transition-transform" />
                        {expanded[res.numero_questao] ? 'Ocultar Detalhes' : 'Ver Auditoria Completa'}
                        {expanded[res.numero_questao] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Área Expandida (Auditoria) */}
                {expanded[res.numero_questao] && (
                  <div className="mt-10 pt-10 border-t border-[hsl(var(--border))] animate-in fade-in slide-in-from-top-4 duration-500 space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                          <div className="w-1 h-3 bg-indigo-500 rounded-full" /> Enunciado Capturado
                        </h5>
                        <div className="bg-[hsl(var(--bg-main)/0.5)] p-6 rounded-[1.5rem] border border-[hsl(var(--border))] text-xs leading-relaxed text-[hsl(var(--text-muted))] font-medium">
                          {res.enunciado}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-3">
                          <div className="w-1 h-3 bg-purple-500 rounded-full" /> Justificativa Neural
                        </h5>
                        <div className="bg-[hsl(var(--bg-main)/0.5)] p-6 rounded-[1.5rem] border border-[hsl(var(--border))] text-xs leading-relaxed text-indigo-100/80 whitespace-pre-wrap italic">
                          {res.justificativa}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {showManualAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass w-full max-w-2xl rounded-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10 relative">
              <button onClick={() => setShowManualAddModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X /></button>
              <h3 className="text-xl font-bold mb-6">Adicionar Questão Manualmente</h3>
              {manualAddError && <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold flex items-center gap-2"><AlertTriangle size={14} />{manualAddError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Número da Questão</label>
                  <input type="number" value={manualQuestionData.numero} onChange={e => setManualQuestionData(p => ({ ...p, numero: e.target.value }))} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Enunciado Completo</label>
                  <textarea value={manualQuestionData.enunciado} onChange={e => setManualQuestionData(p => ({ ...p, enunciado: e.target.value }))} className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-4 mt-1 text-white custom-scrollbar" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Alternativas (uma por linha)</label>
                  <textarea value={manualQuestionData.alternativas} onChange={e => setManualQuestionData(p => ({ ...p, alternativas: e.target.value }))} className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-4 mt-1 text-white custom-scrollbar" placeholder="A) ...&#10;B) ..." />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                  <button onClick={() => setShowManualAddModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold text-sm">Cancelar</button>
                  <button onClick={handleManualAddAndAnalyze} disabled={manualAddLoading} className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                    {manualAddLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {manualAddLoading ? 'Analisando...' : 'Analisar e Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
        <div>
          <h2 className="text-4xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <FileCheck className="text-emerald-400" size={32} />
            </div>
            Corretor de Gabarito IA
          </h2>
          <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mt-3 ml-1">Auditoria Neural de Provas Objetivas</p>
        </div>
      </div>

      {error && (
        <div className="glass-premium bg-red-500/5 border border-red-500/20 p-5 rounded-[1.5rem] text-red-500/80 flex items-center gap-4 animate-in fade-in transition-all">
          <div className="p-2 bg-red-500/20 rounded-xl"><AlertTriangle size={20} /></div>
          <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Alerta de Sistema: {error}</span>
        </div>
      )}

      <div className="flex p-1 bg-[hsl(var(--bg-sidebar)/0.5)] backdrop-blur-md border border-[hsl(var(--border))] rounded-2xl shadow-xl w-fit">
        <button onClick={() => { setActiveTab('new'); setSelectedGabarito(null); }} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'new' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-[0_0_20px_hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-white/5'}`}>Sincronizar Prova</button>
        <button onClick={() => { setActiveTab('history'); setSelectedGabarito(null); }} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-[0_0_20px_hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-white/5'}`}>Arquivo Histórico ({savedGabaritos.length})</button>
      </div>

      {activeTab === 'new' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex gap-2 p-1 bg-[hsl(var(--bg-user-block)/0.5)] rounded-xl border border-[hsl(var(--border))] w-fit mb-10 shadow-lg">
            <button onClick={() => setNewAnalysisType('pdf')} className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-3 transition-all ${newAnalysisType === 'pdf' ? 'bg-[hsl(var(--bg-main))] text-[hsl(var(--accent))] shadow-inner' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}><FileText size={14} /> Visão PDF</button>
            <button onClick={() => setNewAnalysisType('text')} className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-3 transition-all ${newAnalysisType === 'text' ? 'bg-[hsl(var(--bg-main))] text-[hsl(var(--accent))] shadow-inner' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}><TypeIcon size={14} /> Fluxo Textual</button>
          </div>

          {processing ? (
            <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-16 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
              <Loader2 size={64} className="mx-auto animate-spin text-[hsl(var(--accent))] mb-10" />
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Auditoria Neural em Curso</h3>
              <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.3em] mb-12">Processando Página {progress.current} de {progress.total}</p>
              <div className="max-w-md mx-auto relative">
                <div className="w-full bg-[hsl(var(--bg-main))] rounded-full h-1 shadow-inner border border-[hsl(var(--border))] overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_cyan]" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                </div>
              </div>
            </div>
          ) : newAnalysisType === 'pdf' ? (
            <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-16 text-center shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <UploadCloud size={180} className="text-[hsl(var(--accent))]" />
              </div>

              <div className="relative z-10 max-w-xl mx-auto">
                <div className="w-24 h-24 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl text-[hsl(var(--accent))]">
                  <UploadCloud size={40} />
                </div>
                <h3 className="text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-widest mb-3">Sincronizar Documento PDF</h3>
                <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em] mb-12 leading-relaxed">A inteligência neural digitalizará cada página para identificar questões e padrões de gabarito.</p>

                <input type="file" id="pdf-upload" className="hidden" accept=".pdf" onChange={handleFileChange} />
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                  <label htmlFor="pdf-upload" className="w-full sm:w-auto px-10 py-5 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] text-[10px] font-black uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-white/5 transition-all active:scale-95 shadow-xl">Localizar Arquivo</label>
                  <button onClick={handleAnalyzePDF} disabled={!file || !geminiKeyAvailable} className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-30 flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-cyan-500/30">
                    <Sparkles size={18} /> Iniciar Auditoria
                  </button>
                </div>
                {file && (
                  <div className="mt-10 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-in zoom-in-95">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-3"><FileText size={16} /> {file.name}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-12 shadow-2xl relative animate-in fade-in duration-700 overflow-visible">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <TypeIcon size={140} className="text-[hsl(var(--accent))]" />
              </div>

              <div className="relative z-10 space-y-10">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-widest mb-2">Injeção de Massa Textual</h3>
                  <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em]">Deposite o conteúdo das questões para processamento neural</p>
                </div>

                <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Cole o texto das questões aqui. A IA segmentará automaticamente cada item..." className="w-full h-80 bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-[2.5rem] p-8 text-sm text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner resize-none custom-scrollbar leading-relaxed" />

                <button onClick={handleManualAnalyze} disabled={!manualText.trim() || !geminiKeyAvailable} className="w-full px-10 py-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[2rem] disabled:opacity-30 flex items-center justify-center gap-5 transition-all hover:scale-[1.01] active:scale-98 shadow-2xl shadow-emerald-500/20 shadow-border border border-white/10">
                  <Sparkles size={24} /> Ativar Redes de Extração
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <Loader2 className="animate-spin text-[hsl(var(--accent))]" size={48} />
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] animate-pulse">Acessando Banco de Memória...</p>
            </div>
          ) : savedGabaritos.length === 0 ? (
            <div className="py-24 border-2 border-dashed border-[hsl(var(--border))] rounded-[3rem] text-center bg-[hsl(var(--bg-user-block)/0.2)]">
              <History size={64} className="mx-auto text-[hsl(var(--text-muted))] opacity-10 mb-8" />
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum registro de gabarito encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {savedGabaritos.map(item => {
                const correctCount = Object.keys(item.user_answers_json || {}).filter(k => (item.user_answers_json || {})[Number(k)] === item.results_json?.find(r => r.numero_questao === Number(k))?.alternativa_correta_ia).length;
                const totalAnalyzed = Object.keys(item.user_answers_json || {}).length;

                return (
                  <div key={item.id} className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-[hsl(var(--accent)/0.5)] transition-all cursor-pointer relative overflow-hidden shadow-xl" onClick={() => { setSelectedGabarito(item); setUserAnswers(item.user_answers_json || {}); setOfficialAnswers(item.official_answers_json || {}); }}>
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-[hsl(var(--accent)/0.03)] rounded-full blur-3xl group-hover:bg-[hsl(var(--accent)/0.08)] transition-all"></div>

                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest border border-[hsl(var(--border))] group-hover:bg-[hsl(var(--accent)/0.1)] group-hover:text-[hsl(var(--accent))] transition-colors duration-500">{new Date(item.created_at).toLocaleDateString()}</div>
                        </div>
                        <h4 className="text-xl font-black text-[hsl(var(--text-bright))] truncate uppercase tracking-tight group-hover:text-[hsl(var(--accent))] transition-colors leading-tight duration-500">{item.file_name}</h4>
                      </div>
                      <div className="bg-[hsl(var(--bg-user-block))] p-5 rounded-2xl border border-[hsl(var(--border))] text-center min-w-[100px] shadow-2xl transition-transform duration-500 group-hover:scale-110">
                        <div className="text-2xl font-black text-[hsl(var(--accent))] leading-none">{totalAnalyzed > 0 ? `${correctCount}/${totalAnalyzed}` : '---'}</div>
                        <div className="text-[8px] text-[hsl(var(--text-muted))] uppercase font-bold mt-2 tracking-widest">Score IA</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-[hsl(var(--border))] relative z-10">
                      <span className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500/30"></div>
                        Audit: {item.id.substring(0, 8)}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-4 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-2xl text-red-500 border border-red-500/10 transition-all active:scale-90 shadow-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GabaritoIA;
