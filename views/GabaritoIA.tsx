import React, { useState, useMemo, useEffect } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { GabaritoItem, SavedGabarito } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { UploadCloud, Loader2, Sparkles, Download, FileCheck, Check, X, AlertTriangle, ChevronDown, ChevronUp, FileText, Trash2, Save, ArrowLeft, History, BarChart, Type as TypeIcon } from 'lucide-react';

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

const SQL_GABARITOS = `...`; // SQL omitido por brevidade

const AI_PROMPT_GABARITO_IMAGE = `...`; // Prompt de imagem omitido

const AI_PROMPT_GABARITO_TEXT = `
Você é um examinador especialista em concursos. Sua tarefa é analisar o TEXTO fornecido, que pode conter uma ou mais questões.

1.  **IDENTIFIQUE CADA QUESTÃO:** Separe o texto em questões individuais. Use a numeração como guia principal.
2.  **EXTRAIA OS DADOS:** Para cada questão, extraia: o número da questão, o enunciado completo, a alternativa correta (A, B, C, D ou E) e uma justificativa técnica detalhada para sua resposta.
3.  **SAÍDA ESTRITA EM JSON:** Sua resposta DEVE ser um array JSON válido, usando o schema fornecido. Se não encontrar questões, retorne um array JSON vazio \`[]\`.
`;

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
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"/> <span className="text-slate-400">Acertos:</span> <span className="font-bold text-white">{score}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/> <span className="text-slate-400">Erros:</span> <span className="font-bold text-white">{total - score}</span></div>
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
  
  const geminiKeyAvailable = !!getGeminiKey();

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.from('gabaritos_salvos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSavedGabaritos(data || []);
    } catch (err: any) {
      console.error(err);
      if(err.message.includes('relation "public.gabaritos_salvos" does not exist')) {
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
    if (!file || !geminiKeyAvailable) return;
    setProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: getGeminiKey()! });
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
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [imagePart, { text: AI_PROMPT_GABARITO_IMAGE }] },
          config: { responseMimeType: 'application/json', responseSchema: responseSchema }
        });
        
        try {
          const pageResults = JSON.parse(response.text || '[]');
          if (Array.isArray(pageResults)) allResults.push(...pageResults);
        } catch (e) { console.warn(`Página ${i} JSON inválido.`); }
      }

      const sortedResults = allResults.sort((a, b) => a.numero_questao - b.numero_questao);
      
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Usuário não autenticado para salvar a análise.");

      const { data: newRecord, error: insertError } = await supabase.from('gabaritos_salvos')
        .insert({ user_id: user.id, file_name: file.name, results_json: sortedResults, user_answers_json: {}, official_answers_json: {} })
        .select().single();
      
      if(insertError) throw insertError;

      fetchHistory(); setSelectedGabarito(newRecord); setUserAnswers({}); setOfficialAnswers({});
    } catch (err: any) { setError("Falha na análise: " + err.message); console.error(err); } finally { setProcessing(false); }
  };

  const handleManualAnalyze = async () => {
    if (!manualText.trim() || !geminiKeyAvailable) return;
    setProcessing(true);
    setError(null);
    setProgress({ current: 1, total: 1 });

    try {
      const ai = new GoogleGenAI({ apiKey: getGeminiKey()! });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: AI_PROMPT_GABARITO_TEXT + "\n\n--- TEXTO PARA ANÁLISE ---\n" + manualText,
        config: { responseMimeType: 'application/json', responseSchema: responseSchema }
      });
      
      let analysisResults: GabaritoItem[] = [];
      try {
        const parsed = JSON.parse(response.text || '[]');
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
      
      if(insertError) throw insertError;
      fetchHistory(); setSelectedGabarito(newRecord); setUserAnswers({}); setOfficialAnswers({});
    } catch (err: any) { setError("Falha na análise manual: " + err.message); console.error(err); } finally { setProcessing(false); }
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
    const { error } = await supabase.from('gabaritos_salvos').update({ user_answers_json: userAnswers, official_answers_json: officialAnswers }).eq('id', selectedGabarito.id);
    if (error) setError("Falha ao salvar alterações."); else alert("Salvo com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir esta análise permanentemente?")) return;
    await supabase.from('gabaritos_salvos').delete().eq('id', id);
    fetchHistory();
    if (selectedGabarito?.id === id) setSelectedGabarito(null);
  };
  
  const generatePDF = async () => { /* Omitido por brevidade, sem alterações */ };

  if(selectedGabarito) { /* Omitido por brevidade, sem alterações */ return <div/>; }

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center gap-3"><FileCheck /> Corretor de Gabarito IA</h2>
        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3"><AlertTriangle/>{error}</div>}
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/10 self-start">
            <button onClick={() => setActiveTab('new')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'new' ? 'bg-white/10' : 'text-slate-400'}`}>Nova Análise</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'history' ? 'bg-white/10' : 'text-slate-400'}`}>Histórico ({savedGabaritos.length})</button>
        </div>
        
        {activeTab === 'new' && (
            <div className="animate-in fade-in">
              <div className="flex gap-2 p-1 bg-slate-900/30 rounded-xl border border-white/5 self-start mb-6">
                <button onClick={() => setNewAnalysisType('pdf')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${newAnalysisType === 'pdf' ? 'bg-white/10' : 'text-slate-400'}`}><FileText size={14}/> Análise por PDF</button>
                <button onClick={() => setNewAnalysisType('text')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${newAnalysisType === 'text' ? 'bg-white/10' : 'text-slate-400'}`}><TypeIcon size={14}/> Análise por Texto</button>
              </div>

              {processing ? (
                  <div className="glass p-8 rounded-2xl text-center"><Loader2 size={48} className="mx-auto animate-spin text-cyan-400 mb-6"/><h3 className="text-xl font-bold">Analisando...</h3><p className="text-slate-400">Página {progress.current} de {progress.total}.</p><div className="w-full bg-slate-800 rounded-full h-2.5 mt-4"><div className="bg-cyan-500 h-2.5 rounded-full" style={{width: `${(progress.current/progress.total)*100}%`}}></div></div></div>
              ) : newAnalysisType === 'pdf' ? (
                  <div className="glass p-8 rounded-2xl text-center border-2 border-dashed border-slate-700 hover:border-cyan-500">
                      <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6"><UploadCloud size={48} className="text-slate-500"/></div>
                      <h3 className="text-xl font-bold">Envie sua Prova em PDF</h3><p className="text-slate-400 mb-6">A IA irá analisar a imagem de cada página.</p>
                      <input type="file" id="pdf-upload" className="hidden" accept=".pdf" onChange={handleFileChange} /><div className="flex justify-center items-center gap-4"><label htmlFor="pdf-upload" className="px-6 py-3 bg-slate-700 rounded-xl font-bold cursor-pointer">Escolher Arquivo</label><button onClick={handleAnalyzePDF} disabled={!file || !geminiKeyAvailable} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"><Sparkles/> Analisar</button></div>
                      {file && <p className="mt-4 text-sm text-green-400">Selecionado: {file.name}</p>}
                  </div>
              ) : (
                <div className="glass p-8 rounded-2xl space-y-6">
                  <h3 className="text-xl font-bold text-center">Cole as Questões para Análise</h3>
                  <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Cole o texto das questões aqui. Separe-as com um espaço ou linha em branco para a IA identificar." className="w-full h-64 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none custom-scrollbar" />
                  <button onClick={handleManualAnalyze} disabled={!manualText.trim() || !geminiKeyAvailable} className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"><Sparkles/> Analisar Texto</button>
                </div>
              )}
            </div>
        )}
        
        {activeTab === 'history' && (
            <div className="animate-in fade-in">
                {loadingHistory ? <Loader2 className="animate-spin mx-auto"/> : savedGabaritos.length === 0 ? <p className="text-slate-500 text-center py-10">Nenhuma análise salva.</p> : (
                    <div className="space-y-2">
                        {savedGabaritos.map(item => (
                            <div key={item.id} className="glass rounded-xl p-4 flex justify-between items-center group hover:bg-white/5 cursor-pointer" onClick={() => { setSelectedGabarito(item); setUserAnswers(item.user_answers_json || {}); setOfficialAnswers(item.official_answers_json || {}); }}>
                                <div><h4 className="font-bold truncate">{item.file_name}</h4><p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('pt-BR')}</p></div>
                                <div className="flex items-center gap-2"><div className="text-lg font-bold text-cyan-400">{Object.keys(item.user_answers_json).filter(k => item.user_answers_json[Number(k)] === item.results_json.find(r => r.numero_questao === Number(k))?.alternativa_correta_ia).length}/{Object.keys(item.user_answers_json).length}</div><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 bg-slate-800 rounded-full text-slate-500 opacity-20 group-hover:opacity-100 hover:text-red-400"><Trash2 size={16}/></button></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default GabaritoIA;
