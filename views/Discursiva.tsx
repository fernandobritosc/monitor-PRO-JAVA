import React, { useState, useEffect, useRef } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { GoogleGenAI } from "@google/genai";
import { Discursiva as DiscursivaType } from '../types';
import { 
  FileEdit, UploadCloud, Loader2, Sparkles, Download, Database, Copy, X, Trash2, Image as ImageIcon, MessageSquare, List, AlertTriangle
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
  image_url text NOT NULL,
  analysis_text text,
  created_at timestamp with time zone DEFAULT now()
);

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
Você é um examinador especialista em provas discursivas para concursos públicos no Brasil. Sua tarefa é analisar a redação manuscrita na imagem fornecida, baseando-se ESTritamente nos 8 critérios a seguir. Para cada critério, forneça uma nota, uma justificativa detalhada e, se possível, aponte exemplos do texto. A saída DEVE ser em formato Markdown.

**Critérios de Avaliação (Total: 10 pontos):**

1.  **Atendimento ao tema proposto (0 a 2 pontos):** Avalie se o texto aborda o tema central de forma completa, sem tangenciar ou fugir do proposto.
2.  **Clareza de argumentação/senso crítico (0 a 1 ponto):** Verifique a pertinência dos argumentos, a profundidade da análise e a capacidade de relacionar fatos e opiniões de forma crítica.
3.  **Seletividade de informação (0 a 1 ponto):** Analise se o candidato selecionou, organizou e relacionou as informações de forma consistente com o tema.
4.  **Criatividade/originalidade (0 a 2 pontos):** Avalie a originalidade na abordagem do tema e no uso dos argumentos, evitando o senso comum.
5.  **Atendimento à norma padrão da Língua Portuguesa (0 a 1 ponto):** Verifique desvios gramaticais (ortografia, acentuação, morfossintaxe, pontuação) conforme o Acordo Ortográfico. Aponte os erros encontrados de forma clara.
6.  **Coerência (0 a 1 ponto):** Analise a progressão lógica das ideias, a articulação entre as partes do texto e a ausência de contradições.
7.  **Coesão referencial e sequencial (0 a 1 ponto):** Verifique o uso adequado de conectivos, pronomes e outros elementos que garantem a ligação entre frases e parágrafos.
8.  **Atendimento à tipologia textual solicitada (0 a 1 ponto):** Confirme se o texto se enquadra na tipologia dissertativo-argumentativa em prosa.

**Formato da Resposta:**

## Análise da Redação

### 1. Atendimento ao tema proposto
**Nota:** [Sua nota de 0 a 2]
**Justificativa:** [Sua análise detalhada]

### 2. Clareza de argumentação/senso crítico
**Nota:** [Sua nota de 0 a 1]
**Justificativa:** [Sua análise detalhada]

... (repetir para todos os 8 critérios) ...

---

### Tabela de Desvios Gramaticais
| Linha (Aprox.) | Trecho com Desvio | Sugestão de Correção |
|---|---|---|
| [Número da linha] | "[Trecho do erro]" | "[Sugestão]" |
| ... | ... | ... |

---

## Nota Final
**Nota Total:** [Soma das notas / 10]
**Comentário Final:** [Um parágrafo com um feedback geral, pontos fortes e principais pontos a melhorar.]
`;

const Discursiva: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [history, setHistory] = useState<DiscursivaType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  
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
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, {text: AI_PROMPT}] },
      });
      
      const analysisText = response.text || "A IA não retornou uma análise.";

      const { data: newRecord, error: dbError } = await supabase
        .from('discursivas')
        .insert({
          user_id: user.id,
          title,
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
      setError(`Falha na análise: ${err.message}`);
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

  const generatePDF = (analysis: DiscursivaType) => {
    if (!window.jspdf) {
      alert("Biblioteca PDF não carregada. Recarregue a página.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Análise da Discursiva: ${analysis.title}`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date(analysis.created_at).toLocaleDateString()}`, 14, 30);
    
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    const lines = doc.splitTextToSize(analysis.analysis_text, 182);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(lines, 14, 45);

    doc.save(`Analise_Discursiva_${analysis.id.substring(0,8)}.pdf`);
  };

  const AnalysisView = ({ analysis }: { analysis: DiscursivaType }) => (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
        <div className="space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2"><ImageIcon size={16} className="text-slate-400"/> Imagem da Redação</h3>
            <div className="glass rounded-xl p-2">
                <img src={analysis.image_url} alt={analysis.title} className="rounded-lg w-full" />
            </div>
        </div>
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={16} className="text-slate-400"/> Análise da IA</h3>
                <button onClick={() => generatePDF(analysis)} className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg transition-colors"><Download size={14}/> Baixar PDF</button>
            </div>
            <div className="glass rounded-xl p-6 prose prose-sm prose-invert max-w-none prose-h2:text-cyan-400 prose-h3:mt-4 prose-strong:text-white" style={{'--tw-prose-invert-body': '#d1d5db', '--tw-prose-invert-hr': 'rgba(255,255,255,0.1)'} as React.CSSProperties}>
                <div dangerouslySetInnerHTML={{ __html: analysis.analysis_text.replace(/### (.*?)\n/g, '<h3>$1</h3>').replace(/## (.*?)\n/g, '<h2>$1</h2>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
            </div>
        </div>
     </div>
  );

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
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>Histórico ({history.length})</button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map(item => (
                    <div key={item.id} className="glass rounded-xl p-4 space-y-3 relative group">
                        <div onClick={() => setSelectedHistory(item)} className="cursor-pointer">
                            <img src={item.image_url} alt={item.title} className="rounded-lg h-40 w-full object-cover mb-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <h4 className="font-bold text-white truncate">{item.title}</h4>
                            <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                        <button onClick={() => handleDelete(item.id)} className="absolute top-2 right-2 bg-black/40 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"><Trash2 size={14}/></button>
                    </div>
                ))}
            </div>
          )}
        </div>
      )}
      
      {/* TELA DE VISUALIZAÇÃO DE ANÁLISE (NOVA OU DO HISTÓRICO) */}
      {selectedHistory && (
          <AnalysisView analysis={selectedHistory} />
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
