import React, { useState, useEffect } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Discursiva as DiscursivaType } from '../types';
import { discursivasQueries } from '../services/queries';
import { logger } from '../utils/logger';
import { useDiscursivaAnalysis, extractFinalScore } from '../hooks/useDiscursivaAnalysis';
import AnalysisView from '../components/features/discursiva/AnalysisView';
import {
  FileEdit, UploadCloud, Loader2, Sparkles, Download, Database, Copy,
  X, Trash2, AlertTriangle, ChevronLeft, Calendar, List
} from 'lucide-react';

// Declaração para TypeScript reconhecer a biblioteca global
interface JsPDFDoc {
  [key: string]: unknown;
  internal: {
    pageSize: { getWidth: () => number; getHeight: () => number; width: number; height: number };
    getNumberOfPages: () => number;
  };
  setFillColor: (r: number, g: number, b: number) => void;
  rect: (x: number, y: number, w: number, h: number, style: string) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setFontSize: (size: number) => void;
  setFont: (font: string, style: string) => void;
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => void;
  addPage: () => void;
  splitTextToSize: (text: string, width: number) => string[];
  getNumberOfPages: () => number;
  setPage: (page: number) => void;
  getTextWidth: (text: string) => number;
  save: (filename: string) => void;
}

declare global {
  interface Window {
    jspdf?: {
      jsPDF: new (options?: Record<string, unknown>) => JsPDFDoc;
    };
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


const Discursiva: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [history, setHistory] = useState<DiscursivaType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState(''); // NOVO: State para o enunciado

  const [showSql, setShowSql] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<DiscursivaType | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Cole aqui o texto motivador ou a pergunta da banca para uma análise cirúrgica...',
      }),
    ],
    content: prompt,
    onUpdate: ({ editor }) => {
      setPrompt(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-6 text-[hsl(var(--text-bright))]',
      },
    },
  });

  const geminiKeyAvailable = !!getGeminiKey();

  const { isLoading, analysisResult, error, handleAnalyze, setError } = useDiscursivaAnalysis({
    file,
    title,
    prompt,
    geminiKeyAvailable,
    onSuccess: (record) => {
      fetchHistory();
      setActiveTab('history');
      setSelectedHistory(record);
    },
  });

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await discursivasQueries.getAll();
      setHistory(data || []);
    } catch (err: unknown) {
      logger.error('DATA', "Erro ao buscar histórico:", err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('relation "public.discursivas" does not exist')) {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta análise permanentemente?")) return;
    try {
      const itemToDelete = history.find(h => h.id === id);
      if (itemToDelete) {
        const fileName = itemToDelete.image_url.split('/').pop();
        const { data: { user } } = await supabase.auth.getUser();
        if (fileName && user) {
          await supabase.storage.from('discursivas_images').remove([`${user.id}/${fileName}`]);
        }
      }
      await discursivasQueries.delete(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedHistory?.id === id) setSelectedHistory(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError("Falha ao excluir: " + message);
    }
  }

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
                  <div className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-[hsl(var(--accent)/0.5)] transition-all">
                    <div className="flex items-center gap-1 p-2 bg-[hsl(var(--bg-user-block)/0.5)] border-b border-[hsl(var(--border))]">
                      <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        disabled={!editor?.can().chain().focus().toggleBold().run()}
                        className={`p-2 rounded hover:bg-white/10 text-xs font-bold ${editor?.isActive('bold') ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-muted))]'}`}
                      >
                        B
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        disabled={!editor?.can().chain().focus().toggleItalic().run()}
                        className={`p-2 rounded hover:bg-white/10 text-xs italic font-serif ${editor?.isActive('italic') ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-muted))]'}`}
                      >
                        I
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={`p-2 rounded hover:bg-white/10 text-xs ${editor?.isActive('bulletList') ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-muted))]'}`}
                      >
                        List
                      </button>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
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