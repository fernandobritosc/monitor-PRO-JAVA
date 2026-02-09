import React, { useState, useMemo, useRef } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { GabaritoItem } from '../types';
import { UploadCloud, Loader2, Sparkles, Download, FileCheck, Check, X, AlertTriangle, ChevronDown, ChevronUp, FileText } from 'lucide-react';

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

const AI_PROMPT_GABARITO = `
Você é um professor especialista em concursos, membro de uma banca examinadora rigorosa como a FGV/Cebraspe. Analise a imagem desta página de prova. Sua tarefa é:
1. Identificar CADA questão numerada presente na página.
2. Para cada questão, determinar qual é a alternativa correta (A, B, C, D ou E).
3. Fornecer uma justificativa jurídica/técnica detalhada para a alternativa correta, explicando o porquê dela estar certa e, se possível, por que as outras estão erradas.
4. Sua resposta DEVE ser um JSON válido contendo uma lista de objetos, seguindo estritamente a estrutura definida.
`;

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      numero_questao: { type: Type.INTEGER },
      alternativa_correta_ia: { type: Type.STRING },
      justificativa: { type: Type.STRING }
    },
    required: ["numero_questao", "alternativa_correta_ia", "justificativa"]
  }
};

const GabaritoIA: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<GabaritoItem[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [officialAnswers, setOfficialAnswers] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const geminiKeyAvailable = !!getGeminiKey();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResults(null);
      setError(null);
    } else {
      setError("Por favor, selecione um arquivo PDF.");
    }
  };

  const handleAnalyze = async () => {
    if (!file || !geminiKeyAvailable) {
      setError(geminiKeyAvailable ? "Nenhum arquivo PDF selecionado." : "Chave da API Gemini não configurada.");
      return;
    }
    setProcessing(true);
    setError(null);
    setResults(null);

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
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
        const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [imagePart, { text: AI_PROMPT_GABARITO }] },
          config: { 
            responseMimeType: 'application/json',
            responseSchema: responseSchema 
          }
        });
        
        try {
          const pageResults = JSON.parse(response.text || '[]');
          if (Array.isArray(pageResults)) {
            allResults.push(...pageResults);
          }
        } catch (parseError) {
          console.warn(`Página ${i} retornou JSON inválido, pulando.`, response.text);
        }
      }

      setResults(allResults.sort((a, b) => a.numero_questao - b.numero_questao));
    } catch (err: any) {
      setError("Falha na análise: " + err.message);
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const scores = useMemo(() => {
    if (!results) return { vsAI: { score: 0, total: 0 }, vsOfficial: { score: 0, total: 0 }};
    let scoreAI = 0, totalAI = 0, scoreOfficial = 0, totalOfficial = 0;
    results.forEach(res => {
        if (userAnswers[res.numero_questao]) {
            totalAI++;
            if(userAnswers[res.numero_questao] === res.alternativa_correta_ia) scoreAI++;
        }
        if (officialAnswers[res.numero_questao] && userAnswers[res.numero_questao]) {
            totalOfficial++;
            if(userAnswers[res.numero_questao] === officialAnswers[res.numero_questao]) scoreOfficial++;
        }
    });
    return { vsAI: { score: scoreAI, total: totalAI }, vsOfficial: { score: scoreOfficial, total: totalOfficial }};
  }, [results, userAnswers, officialAnswers]);

  const generatePDF = () => {
    if (!results || !window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Gabarito IA - Análise de Prova", 14, 22);
    (doc as any).autoTable({
        startY: 30,
        head: [['Questão', 'Sua Resposta', 'Gabarito IA', 'Gabarito Oficial', 'Resultado (IA)']],
        body: results.map(r => [
            r.numero_questao,
            userAnswers[r.numero_questao] || '-',
            r.alternativa_correta_ia,
            officialAnswers[r.numero_questao] || '-',
            userAnswers[r.numero_questao] === r.alternativa_correta_ia ? '✅' : '❌'
        ]),
        theme: 'striped'
    });
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    results.forEach(r => {
        if (finalY > 260) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12);
        doc.text(`Questão ${r.numero_questao} - Justificativa`, 14, finalY);
        finalY += 6;
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(r.justificativa, 180);
        doc.text(splitText, 14, finalY);
        finalY += (splitText.length * 4) + 6;
    });
    const fileName = (file?.name ?? 'prova').replace('.pdf','');
    doc.save(`gabarito-ia-${fileName}.pdf`);
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setUserAnswers({});
    setOfficialAnswers({});
    setError(null);
  };
  
  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center gap-3">
            <FileCheck /> Corretor de Gabarito IA
        </h2>

        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3"><AlertTriangle/>{error}</div>}

        {!results && !processing && (
            <div className="glass p-8 rounded-2xl text-center border-2 border-dashed border-slate-700 hover:border-cyan-500 transition-all">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6"><UploadCloud size={48} className="text-slate-500"/></div>
                <h3 className="text-xl font-bold text-white mb-2">Envie sua Prova em PDF</h3>
                <p className="text-slate-400 mb-6">A IA irá analisar questão por questão e gerar um gabarito comentado.</p>
                <input type="file" id="pdf-upload" className="hidden" accept=".pdf" onChange={handleFileChange} />
                <div className="flex justify-center items-center gap-4">
                    <label htmlFor="pdf-upload" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold cursor-pointer transition-colors">Escolher Arquivo</label>
                    <button onClick={handleAnalyze} disabled={!file || !geminiKeyAvailable} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"><Sparkles/> Analisar</button>
                </div>
                {file && <p className="mt-4 text-sm text-green-400">Arquivo selecionado: {file.name}</p>}
            </div>
        )}

        {processing && (
            <div className="glass p-8 rounded-2xl text-center"><Loader2 size={48} className="mx-auto animate-spin text-cyan-400 mb-6"/>
                <h3 className="text-xl font-bold text-white mb-2">Analisando...</h3>
                <p className="text-slate-400">Página {progress.current} de {progress.total}. Isso pode levar alguns minutos.</p>
                <div className="w-full bg-slate-800 rounded-full h-2.5 mt-4"><div className="bg-cyan-500 h-2.5 rounded-full" style={{width: `${(progress.current/progress.total)*100}%`}}></div></div>
            </div>
        )}
        
        {results && (
            <div className="space-y-6">
                 <div className="flex flex-wrap gap-4 justify-between items-center">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-4 rounded-xl"><div className="text-xs font-bold text-slate-400 uppercase mb-1">Nota vs IA</div><div className="text-2xl font-bold text-cyan-400">{scores.vsAI.score}/{scores.vsAI.total}</div></div>
                        <div className="glass p-4 rounded-xl"><div className="text-xs font-bold text-slate-400 uppercase mb-1">Nota vs Oficial</div><div className="text-2xl font-bold text-green-400">{scores.vsOfficial.score}/{scores.vsOfficial.total}</div></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={generatePDF} className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Download size={14}/> Gerar PDF</button>
                        <button onClick={reset} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2"><X size={14}/> Nova Análise</button>
                    </div>
                 </div>
                 <div className="space-y-2">
                    {results.map(res => {
                        const userAnswer = userAnswers[res.numero_questao];
                        const officialAnswer = officialAnswers[res.numero_questao];
                        const isCorrectVsIA = userAnswer && userAnswer === res.alternativa_correta_ia;
                        const isCorrectVsOfficial = userAnswer && officialAnswer && userAnswer === officialAnswer;
                        const isExpanded = !!expanded[res.numero_questao];

                        return (
                            <div key={res.numero_questao} className="glass rounded-xl p-4">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-1 font-bold text-lg">#{res.numero_questao}</div>
                                    <div className="col-span-4 md:col-span-3">
                                        <h4 className="text-xs text-slate-400 mb-1 font-bold">Sua Resposta</h4>
                                        <div className="flex gap-1">
                                            {['A','B','C','D','E'].map(opt => (
                                                <button key={opt} onClick={() => setUserAnswers(p => ({...p, [res.numero_questao]: opt}))} className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${userAnswer === opt ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{opt}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-center">
                                        <h4 className="text-xs text-slate-400 mb-1 font-bold">Gabarito IA</h4>
                                        <div className="font-bold text-xl text-cyan-400">🤖 {res.alternativa_correta_ia}</div>
                                    </div>
                                    <div className="col-span-4 md:col-span-3">
                                        <h4 className="text-xs text-slate-400 mb-1 font-bold">Gabarito Oficial</h4>
                                        <select onChange={e => setOfficialAnswers(p => ({...p, [res.numero_questao]: e.target.value}))} value={officialAnswer || ''} className="w-20 bg-slate-800 border border-slate-700 rounded-md p-1 text-sm"><option value="">-</option>{['A','B','C','D','E'].map(opt => <option key={opt}>{opt}</option>)}</select>
                                    </div>
                                    <div className="col-span-12 md:col-span-3 flex items-center justify-between md:justify-end gap-2">
                                        <div className="flex gap-2">
                                            {userAnswer && <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCorrectVsIA ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{isCorrectVsIA ? <Check/> : <X/>}</div>}
                                            {userAnswer && officialAnswer && <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCorrectVsOfficial ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{isCorrectVsOfficial ? <Check/> : <X/>}</div>}
                                        </div>
                                        <button onClick={() => setExpanded(p => ({...p, [res.numero_questao]: !isExpanded}))} className="p-2 text-slate-400 hover:text-white"><FileText size={16}/>{isExpanded ? <ChevronUp/> : <ChevronDown/>}</button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in">
                                        <h5 className="text-sm font-bold text-purple-400 mb-2">Justificativa da IA</h5>
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{res.justificativa}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                 </div>
            </div>
        )}
    </div>
  );
};

export default GabaritoIA;