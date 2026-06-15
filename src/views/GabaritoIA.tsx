import React, { useState, useMemo, useEffect } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent, parseAIJSON } from '../services/aiService';
import { logger } from '../utils/logger';
import { gabaritosQueries } from '../services/queries';
import { GabaritoItem, SavedGabarito } from '../types';
import { UploadCloud, Loader2, Sparkles, Download, FileCheck, AlertTriangle, Trash2, Save, ArrowLeft, History, BarChart, Type as TypeIcon, PlusCircle, FileText } from 'lucide-react';
import { PieChartComponent } from '../components/shared/PieChartComponent';
import GabaritoQuestionCard from '../components/features/gabarito/GabaritoQuestionCard';
import ManualQuestionModal from '../components/features/gabarito/ManualQuestionModal';
import { useManualQuestion } from '../hooks/useManualQuestion';
import { generateGabaritoPDF } from '../utils/pdfGenerator';

// Declarações para TypeScript reconhecer as bibliotecas globais
declare global {
  interface Window {
    pdfjsLib: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (num: number) => Promise<{
            getViewport: (params: { scale: number }) => { width: number; height: number };
            render: (params: { canvasContext: CanvasRenderingContext2D; viewport: any }) => { promise: Promise<void> };
          }>;
        }>;
      };
    };
    jspdf: any;
  }
}
if (typeof window !== 'undefined' && window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const AI_PROMPT_GABARITO_IMAGE = `
Você é um examinador especialista em concursos. Sua tarefa é analisar a IMAGEM de uma página de prova.

REGRAS DE OURO (SISTEMA):
1.  **NUNCA USE "..."**: O campo "enunciado" DEVE conter o texto integral. Se você resumir, a análise será descartada.
2.  **COPIA FIEL**: Transcreva cada palavra do enunciado e das alternativas.
3.  **IDENTIFIQUE DEZENAS DE QUESTÕES**: Se houver 50 questões na imagem, analise as 50.

SAÍDA: Array JSON [\n  {\n    "numero_questao": X,\n    "enunciado": "TEXTO VERBATIM",\n    "alternativa_correta_ia": "X",\n    "justificativa": "RESPOSTA TÉCNICA"\n  }\n]
`;

const AI_PROMPT_GABARITO_TEXT = `
Você é um examinador sênior. Analise o TEXTO fornecido.

REGRAS CRÍTICAS:
1.  **INTEGRIDADE ABSOLUTA**: O campo "enunciado" DEVE conter 100% do texto da questão. É PROIBIDO omitir partes com reticências.
2.  **FORMATO**: Retorne EXCLUSIVAMENTE um array JSON.

SCHEMA: [{ "numero_questao": number, "enunciado": string, "alternativa_correta_ia": string, "justificativa": string }]
`;

interface AIAnalysisPageResult {
  numero_questao: number;
  enunciado: string;
  alternativa_correta_ia: string;
  justificativa: string;
}

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

  const geminiKeyAvailable = !!getGeminiKey();

  const manualQuestion = useManualQuestion((newQuestion) => {
    setSelectedGabarito(prev => {
      if (!prev) return null;
      const updatedResults = [...prev.results_json.filter(q => q.numero_questao !== newQuestion.numero_questao), newQuestion]
        .sort((a, b) => a.numero_questao - b.numero_questao);
      return { ...prev, results_json: updatedResults };
    });
  });

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await gabaritosQueries.getAll();
      setSavedGabaritos(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('DATA', 'Erro ao buscar histórico', err);
      if (message.includes('relation "public.gabaritos_salvos" does not exist')) {
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
          const pageResults = parseAIJSON(responseText) as AIAnalysisPageResult[];
          if (Array.isArray(pageResults)) allResults.push(...pageResults);
        } catch (e) { 
          logger.warn('AI', `Página ${i} JSON inválido.`); 
        }
      }

      const sortedResults = allResults.sort((a, b) => a.numero_questao - b.numero_questao);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado para salvar a análise.");

      const newRecord = await gabaritosQueries.insert({ 
        user_id: user.id, 
        file_name: file.name, 
        results_json: sortedResults, 
        user_answers_json: {}, 
        official_answers_json: {} 
      });

      fetchHistory(); 
      setSelectedGabarito(newRecord as SavedGabarito); 
      setUserAnswers({}); 
      setOfficialAnswers({});
    } catch (err) { 
      const message = err instanceof Error ? err.message : String(err);
      setError("Falha na análise: " + message); 
      logger.error('AI', 'Falha na IA PDF', err); 
    } finally { 
      setProcessing(false); 
    }
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
        const parsed = parseAIJSON(responseText) as GabaritoItem[];
        if (!Array.isArray(parsed)) throw new Error("AI did not return an array.");
        analysisResults = parsed;
      } catch (e) { throw new Error("A IA retornou um formato de dados inválido."); }

      const sortedResults = analysisResults.sort((a, b) => a.numero_questao - b.numero_questao);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado para salvar a análise.");

      const fileName = `Análise Manual - ${new Date().toLocaleDateString('pt-BR')}`;
      const newRecord = await gabaritosQueries.insert({ user_id: user.id, file_name: fileName, results_json: sortedResults, user_answers_json: {}, official_answers_json: {} });

      fetchHistory(); 
      setSelectedGabarito(newRecord as SavedGabarito); 
      setUserAnswers({}); 
      setOfficialAnswers({});
    } catch (err) { 
      const message = err instanceof Error ? err.message : String(err);
      setError("Falha na análise manual: " + message); 
      logger.error('AI', 'Falha na IA TXT', err); 
    } finally { 
      setProcessing(false); 
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
    try {
      await gabaritosQueries.update(selectedGabarito.id, {
        user_answers_json: userAnswers,
        official_answers_json: officialAnswers,
        results_json: selectedGabarito.results_json
      });
      alert("Salvo com sucesso!");
    } catch (error) {
      setError("Falha ao salvar alterações.");
      logger.error('DATA', 'Erro ao salvar gabarito', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta análise permanentemente?")) return;
    try {
      await gabaritosQueries.delete(id);
      fetchHistory();
      if (selectedGabarito?.id === id) setSelectedGabarito(null);
    } catch (error) {
      logger.error('DATA', 'Erro ao excluir gabarito', error);
    }
  };

  const handleGeneratePDF = () => {
    if (selectedGabarito && scores) {
      generateGabaritoPDF({ selectedGabarito, scores, userAnswers, officialAnswers });
    }
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
            <button onClick={() => manualQuestion.setShowModal(true)} className="px-6 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-[hsl(var(--border))] transition-all">
              <PlusCircle size={16} className="text-emerald-400" /> Adicionar Item
            </button>
            <button onClick={handleGeneratePDF} className="px-6 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-[hsl(var(--border))] transition-all">
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
          {selectedGabarito.results_json.map(res => (
            <GabaritoQuestionCard
              key={res.numero_questao}
              question={res}
              userAnswer={userAnswers[res.numero_questao]}
              officialAnswer={officialAnswers[res.numero_questao]}
              isExpanded={expanded[res.numero_questao]}
              onUserAnswerChange={(n, v) => setUserAnswers(p => ({ ...p, [n]: v }))}
              onOfficialAnswerChange={(n, v) => setOfficialAnswers(p => ({ ...p, [n]: v }))}
              onToggleExpand={(n) => setExpanded(p => ({ ...p, [n]: !p[n] }))}
            />
          ))}
        </div>

        <ManualQuestionModal
          show={manualQuestion.showModal}
          loading={manualQuestion.loading}
          error={manualQuestion.error}
          questionData={manualQuestion.questionData}
          onQuestionDataChange={manualQuestion.setQuestionData}
          onClose={() => manualQuestion.setShowModal(false)}
          onSubmit={manualQuestion.handleSubmit}
        />
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
