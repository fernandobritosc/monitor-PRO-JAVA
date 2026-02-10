import React, { useState, useMemo, useEffect } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { GabaritoItem, SavedGabarito } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { UploadCloud, Loader2, Sparkles, Download, FileCheck, Check, X, AlertTriangle, ChevronDown, ChevronUp, FileText, Trash2, Save, ArrowLeft, History, BarChart } from 'lucide-react';

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

const SQL_GABARITOS = `
CREATE TABLE IF NOT EXISTS public.gabaritos_salvos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text,
  results_json jsonb,
  user_answers_json jsonb,
  official_answers_json jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE gabaritos_salvos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Leitura Propria Gabaritos" ON gabaritos_salvos;
CREATE POLICY "Permitir Leitura Propria Gabaritos" ON gabaritos_salvos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Criacao Propria Gabaritos" ON gabaritos_salvos;
CREATE POLICY "Permitir Criacao Propria Gabaritos" ON gabaritos_salvos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Edicao Propria Gabaritos" ON gabaritos_salvos;
CREATE POLICY "Permitir Edicao Propria Gabaritos" ON gabaritos_salvos FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Exclusao Propria Gabaritos" ON gabaritos_salvos;
CREATE POLICY "Permitir Exclusao Propria Gabaritos" ON gabaritos_salvos FOR DELETE USING (auth.uid() = user_id);
`;

const AI_PROMPT_GABARITO_IMAGE = `
Você é um examinador especialista em concursos, membro de uma banca examinadora rigorosa. Sua tarefa é analisar a IMAGEM de uma página de prova.

1.  **IDENTIFIQUE TODAS AS QUESTÕES:** Examine a imagem e identifique **TODAS** as questões numeradas.
2.  **EXTRAIA O ENUNCIADO COMPLETO:** Para cada questão, transcreva o **texto completo do enunciado**, incluindo o texto base se houver.
3.  **RESOLVA E JUSTIFIQUE:** Determine a alternativa correta (A, B, C, D ou E) e forneça uma justificativa técnica detalhada para a resposta.
4.  **SAÍDA ESTRITA EM JSON:** Sua resposta DEVE ser um array JSON válido. Se não encontrar questões, retorne um array JSON vazio \`[]\`.
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

const PieChartComponent: React.FC<{ data: any[], colors: string[] }> = ({ data, colors }) => (
  <ResponsiveContainer width="100%" height={120}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={5}>
        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
      </Pie>
      <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
    </PieChart>
  </ResponsiveContainer>
);

const GabaritoIA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [savedGabaritos, setSavedGabaritos] = useState<SavedGabarito[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedGabarito, setSelectedGabarito] = useState<SavedGabarito | null>(null);

  const [file, setFile] = useState<File | null>(null);
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

  const handleAnalyze = async () => {
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
        .insert({
            user_id: user.id,
            file_name: file.name,
            results_json: sortedResults,
            user_answers_json: {},
            official_answers_json: {}
        })
        .select()
        .single();
      
      if(insertError) throw insertError;

      fetchHistory();
      setSelectedGabarito(newRecord);
      setUserAnswers({});
      setOfficialAnswers({});

    } catch (err: any) {
      setError("Falha na análise: " + err.message);
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const scores = useMemo(() => {
    if (!selectedGabarito) return null;
    const results = selectedGabarito.results_json;
    let scoreAI = 0, totalAI = 0, scoreOfficial = 0, totalOfficial = 0;
    
    results.forEach(res => {
      const uA = userAnswers[res.numero_questao];
      const oA = officialAnswers[res.numero_questao];
      if (uA) {
          totalAI++;
          if (uA === res.alternativa_correta_ia) scoreAI++;
      }
      if (oA && uA) {
          totalOfficial++;
          if (uA === oA) scoreOfficial++;
      }
    });

    const dataVsAI = [{ name: 'Acertos', value: scoreAI }, { name: 'Erros', value: totalAI - scoreAI }];
    const dataVsOfficial = [{ name: 'Acertos', value: scoreOfficial }, { name: 'Erros', value: totalOfficial - scoreOfficial }];

    return { dataVsAI, dataVsOfficial, totals: { scoreAI, totalAI, scoreOfficial, totalOfficial } };
  }, [selectedGabarito, userAnswers, officialAnswers]);

  const handleUpdate = async () => {
    if (!selectedGabarito) return;
    const { error } = await supabase.from('gabaritos_salvos')
      .update({ user_answers_json: userAnswers, official_answers_json: officialAnswers })
      .eq('id', selectedGabarito.id);
    if (error) setError("Falha ao salvar alterações."); else alert("Salvo com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir esta análise permanentemente?")) return;
    await supabase.from('gabaritos_salvos').delete().eq('id', id);
    fetchHistory();
    if (selectedGabarito?.id === id) setSelectedGabarito(null);
  };
  
  const generatePDF = async () => {
    if (!selectedGabarito || !window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: { user } } = await (supabase.auth as any).getUser();

    // HEADER
    doc.setFontSize(18); doc.text("Análise de Gabarito - MonitorPro", 14, 22);
    doc.setFontSize(10); doc.text(`Prova: ${selectedGabarito.file_name}`, 14, 30);
    doc.text(`Usuário: ${user?.email || 'N/A'}`, 14, 35);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 40);

    // SUMMARY
    (doc as any).autoTable({
        startY: 45,
        head: [['Comparativo', 'Acertos', 'Total', 'Nota']],
        body: [
            ['vs. IA', scores?.totals.scoreAI, scores?.totals.totalAI, `${(scores?.totals.totalAI??0 > 0 ? (scores?.totals.scoreAI??0) / scores!.totals.totalAI * 100 : 0).toFixed(0)}%`],
            ['vs. Oficial', scores?.totals.scoreOfficial, scores?.totals.totalOfficial, `${(scores?.totals.totalOfficial??0 > 0 ? (scores?.totals.scoreOfficial??0) / scores!.totals.totalOfficial * 100 : 0).toFixed(0)}%`]
        ]
    });
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // DETAILED TABLE
    (doc as any).autoTable({
        startY: finalY,
        head: [['Questão', 'Sua Resposta', 'Gabarito Oficial', 'Resultado']],
        body: selectedGabarito.results_json.map(r => [
            r.numero_questao,
            userAnswers[r.numero_questao] || '-',
            officialAnswers[r.numero_questao] || '-',
            userAnswers[r.numero_questao] === officialAnswers[r.numero_questao] ? 'CORRETO' : 'ERRADO'
        ]),
        didParseCell: (data: any) => {
            if (data.column.index === 3 && data.cell.raw === 'CORRETO') {
                data.cell.styles.textColor = [0, 150, 0];
                data.cell.styles.fillColor = [230, 255, 230];
            }
        }
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;

    // JUSTIFICATIONS
    selectedGabarito.results_json.forEach(r => {
        if (finalY > 250) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12); doc.text(`Questão ${r.numero_questao}: ${r.alternativa_correta_ia}`, 14, finalY);
        finalY += 5;
        doc.setFontSize(10); 
        const splitEnunciado = doc.splitTextToSize(`Enunciado: ${r.enunciado}`, 180);
        doc.text(splitEnunciado, 14, finalY);
        finalY += (splitEnunciado.length * 4) + 2;
        const splitJustificativa = doc.splitTextToSize(`Justificativa: ${r.justificativa}`, 180);
        doc.text(splitJustificativa, 14, finalY);
        finalY += (splitJustificativa.length * 4) + 8;
    });

    doc.save(`gabarito-analise-${selectedGabarito.file_name}.pdf`);
  };

  if(selectedGabarito) {
    return (
        <div className="space-y-6 animate-in fade-in">
            <button onClick={() => setSelectedGabarito(null)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft/> Voltar ao Histórico</button>
            <div className="flex justify-between items-center">
                <div><h3 className="text-2xl font-bold truncate">{selectedGabarito.file_name}</h3><p className="text-xs text-slate-400">{new Date(selectedGabarito.created_at).toLocaleString('pt-BR')}</p></div>
                <div className="flex gap-2"><button onClick={generatePDF} className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Download size={14}/> PDF</button><button onClick={handleUpdate} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Save size={14}/> Salvar</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl"><h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sua Nota vs. IA</h4>{scores && <PieChartComponent data={scores.dataVsAI} colors={['#22c55e', '#ef4444']} />}</div>
                <div className="glass p-4 rounded-xl"><h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sua Nota vs. Gabarito Oficial</h4>{scores && <PieChartComponent data={scores.dataVsOfficial} colors={['#22c55e', '#ef4444']} />}</div>
            </div>
            <div className="space-y-2">
                {selectedGabarito.results_json.map(res => {
                    const isCorrectVsOfficial = userAnswers[res.numero_questao] && officialAnswers[res.numero_questao] && userAnswers[res.numero_questao] === officialAnswers[res.numero_questao];
                    return (
                        <div key={res.numero_questao} className={`glass rounded-xl p-4 border-l-4 ${userAnswers[res.numero_questao] ? (isCorrectVsOfficial ? 'border-green-500' : 'border-red-500') : 'border-transparent'}`}>
                            <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-12 md:col-span-6"><h4 className="font-bold text-lg mb-2 text-white">Questão {res.numero_questao}</h4><p className="text-sm text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5">{res.enunciado}</p></div>
                                <div className="col-span-6 md:col-span-2"><h4 className="text-xs text-slate-400 mb-1 font-bold">Sua Resposta</h4><div className="flex gap-1">{['A','B','C','D','E'].map(opt => <button key={opt} onClick={() => setUserAnswers(p => ({...p, [res.numero_questao]: opt}))} className={`w-7 h-7 rounded-md text-xs font-bold ${userAnswers[res.numero_questao] === opt ? 'bg-purple-500' : 'bg-slate-800'}`}>{opt}</button>)}</div></div>
                                <div className="col-span-6 md:col-span-2"><h4 className="text-xs text-slate-400 mb-1 font-bold">Gabarito Oficial</h4><select onChange={e => setOfficialAnswers(p => ({...p, [res.numero_questao]: e.target.value}))} value={officialAnswers[res.numero_questao] || ''} className="w-20 bg-slate-800 border-slate-700 rounded-md p-1 text-sm"><option value="">-</option>{['A','B','C','D','E'].map(opt => <option key={opt}>{opt}</option>)}</select></div>
                                <div className="col-span-12 md:col-span-2"><button onClick={() => setExpanded(p => ({...p, [res.numero_questao]: !p[res.numero_questao]}))} className="w-full p-2 text-slate-400 hover:text-white flex items-center justify-center gap-2 text-xs font-bold"><FileText size={14}/> Justificativa {expanded[res.numero_questao] ? <ChevronUp/> : <ChevronDown/>}</button></div>
                            </div>
                            {expanded[res.numero_questao] && <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in"><h5 className="text-sm font-bold text-purple-400 mb-2">Justificativa da IA (Gabarito: {res.alternativa_correta_ia})</h5><p className="text-sm text-slate-300 whitespace-pre-wrap">{res.justificativa}</p></div>}
                        </div>
                    )
                })}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center gap-3">
            <FileCheck /> Corretor de Gabarito IA
        </h2>
        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3"><AlertTriangle/>{error}</div>}
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/10 self-start">
            <button onClick={() => setActiveTab('new')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'new' ? 'bg-white/10' : 'text-slate-400'}`}>Nova Análise</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'history' ? 'bg-white/10' : 'text-slate-400'}`}>Histórico ({savedGabaritos.length})</button>
        </div>
        
        {activeTab === 'new' && (
            processing ? (
                <div className="glass p-8 rounded-2xl text-center"><Loader2 size={48} className="mx-auto animate-spin text-cyan-400 mb-6"/><h3 className="text-xl font-bold">Analisando...</h3><p className="text-slate-400">Página {progress.current} de {progress.total}.</p><div className="w-full bg-slate-800 rounded-full h-2.5 mt-4"><div className="bg-cyan-500 h-2.5 rounded-full" style={{width: `${(progress.current/progress.total)*100}%`}}></div></div></div>
            ) : (
                <div className="glass p-8 rounded-2xl text-center border-2 border-dashed border-slate-700 hover:border-cyan-500">
                    <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6"><UploadCloud size={48} className="text-slate-500"/></div>
                    <h3 className="text-xl font-bold">Envie sua Prova em PDF</h3><p className="text-slate-400 mb-6">A IA irá analisar a imagem de cada página.</p>
                    <input type="file" id="pdf-upload" className="hidden" accept=".pdf" onChange={handleFileChange} /><div className="flex justify-center items-center gap-4"><label htmlFor="pdf-upload" className="px-6 py-3 bg-slate-700 rounded-xl font-bold cursor-pointer">Escolher Arquivo</label><button onClick={handleAnalyze} disabled={!file || !geminiKeyAvailable} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"><Sparkles/> Analisar</button></div>
                    {file && <p className="mt-4 text-sm text-green-400">Selecionado: {file.name}</p>}
                </div>
            )
        )}
        
        {activeTab === 'history' && (
            <div className="animate-in fade-in">
                {loadingHistory ? <Loader2 className="animate-spin mx-auto"/> : savedGabaritos.length === 0 ? <p className="text-slate-500 text-center py-10">Nenhuma análise salva.</p> : (
                    <div className="space-y-2">
                        {savedGabaritos.map(item => (
                            <div key={item.id} className="glass rounded-xl p-4 flex justify-between items-center group hover:bg-white/5 cursor-pointer" onClick={() => { setSelectedGabarito(item); setUserAnswers(item.user_answers_json); setOfficialAnswers(item.official_answers_json); }}>
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
