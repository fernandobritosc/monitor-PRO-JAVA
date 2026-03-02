import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { Question, EditalMateria, GlobalQuestion, QuestionAttempt } from '../types';
import { Search, Trash2, Edit, ExternalLink, AlertOctagon, CheckCircle2, X, ChevronDown, ChevronUp, FileText, Target, Zap, Layers, Clock, Plus, Brain, Volume2, Sparkles, Trophy, RotateCcw, ChevronLeft, ChevronRight, Save, Headphones, Music, Table, Map as MapIcon, Send, MessageSquarePlus, Hash, PlusCircle, BarChart2, Upload, ImageIcon, RefreshCw } from 'lucide-react';
import { streamAIContent, AIProviderName, generateAIContent, handlePlayRevisionAudio, generatePodcastAudio, deleteCachedAudio } from '../services/aiService';
import { CustomSelector } from '../components/CustomSelector';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { AIContentBox } from '../components/shared/AIContentBox';
import { useStore } from '../hooks/useStore';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
interface EditorToolbarProps {
  editor: Editor | null;
}

const EditorToolbar: React.FC<EditorToolbarProps & { onImageUpload?: (file: File) => void }> = ({ editor, onImageUpload }) => {
  if (!editor) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImageUrl = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
    // Reset input to allow same file again
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-white/5 border-b border-white/10">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('bold') ? 'text-[hsl(var(--accent))] bg-white/10' : 'text-slate-400'}`}
        title="Negrito"
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('italic') ? 'text-[hsl(var(--accent))] bg-white/10' : 'text-slate-400'}`}
        title="Itálico"
      >
        <span className="italic font-serif">I</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('underline') ? 'text-[hsl(var(--accent))] bg-white/10' : 'text-slate-400'}`}
        title="Sublinhado"
      >
        <span className="underline">U</span>
      </button>
      <div className="w-px h-6 bg-white/10 mx-1 self-center" />
      <div className="flex gap-0.5 items-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400 group relative"
          title="Upload de Imagem"
        >
          <Upload size={16} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </button>
        <button
          type="button"
          onClick={addImageUrl}
          className="p-2 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400"
          title="Inserir via URL"
        >
          <ImageIcon size={16} />
        </button>
      </div>
    </div>
  );
};

interface QuestionsBankProps {
  missaoAtiva: string;
  editais: EditalMateria[];
  initialTab?: 'gerador' | 'cadastro';
}

// Helper para pegar data local YYYY-MM-DD
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const extractTecId = (tecField: string | undefined): { id: string, url: string } | null => {
  if (!tecField) return null;
  const numericRegex = /^\d+$/;
  const urlRegex = /https?:\/\/www\.tecconcursos\.com\.br\/questoes\/(\d+)/;

  if (numericRegex.test(tecField)) {
    return {
      id: tecField,
      url: `https://www.tecconcursos.com.br/questoes/${tecField}`
    };
  }

  const match = tecField.match(urlRegex);
  if (match) {
    return {
      id: match[1],
      url: tecField
    };
  }

  // Se não bater no regex mas parecer uma URL, retornamos ela mas com ID vazio
  if (tecField.startsWith('http')) {
    return { id: 'Ver Link', url: tecField };
  }

  return { id: tecField, url: `https://www.tecconcursos.com.br/questoes/${tecField}` };
};

// Helper para links
const formatTextWithLinks = (text: string | undefined) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-300 transition-colors inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {part} <ExternalLink size={10} />
        </a>
      );
    }
    return part;
  });
};

const QuestionAnalytics: React.FC<{
  questionId: string;
  alternativas: any[];
  onClose: () => void;
}> = ({ questionId, alternativas, onClose }) => {
  const [data, setData] = useState<{ global: any[], alts: any[], userStats: { correct: number, total: number } | null, avgTime: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: attempts } = await supabase.from('questao_tentativas').select('*').eq('question_id', questionId);

        if (attempts) {
          const correct = attempts.filter(a => a.is_correct).length;
          const total = attempts.length;
          const globalStats = [
            { name: 'Acertos', value: correct, color: '#22c55e' },
            { name: 'Erros', value: total - correct, color: '#ef4444' }
          ];
          const altCounts = alternativas.map(alt => {
            const count = attempts.filter(a => a.selected_alt === alt.id).length;
            return { name: alt.label, count: count, percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0" };
          });
          let userPerformance = null;
          if (user) {
            const userAttempts = attempts.filter(a => a.user_id === user.id);
            userPerformance = { correct: userAttempts.filter(a => a.is_correct).length, total: userAttempts.length };
          }
          // Avg response time from attempts that have tempo_resposta
          const withTime = attempts.filter(a => a.tempo_resposta != null);
          const avgTime = withTime.length > 0
            ? Math.round(withTime.reduce((sum, a) => sum + a.tempo_resposta, 0) / withTime.length)
            : null;

          setData({ global: globalStats, alts: altCounts, userStats: userPerformance, avgTime });
        }
      } catch (err) { console.error("Stats Error:", err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, [questionId, alternativas]);

  if (loading) return (
    <div className="flex items-center justify-center p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-card))] animate-pulse min-h-[100px]">
      <div className="w-4 h-4 rounded-full border-t-2 border-[hsl(var(--accent))] animate-spin mr-3" />
      <span className="text-[7px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Sincronizando Dados...</span>
    </div>
  );

  if (!data) return null;
  const totalGlobal = data.global.reduce((acc, curr) => acc + curr.value, 0);
  const correctRate = totalGlobal > 0 ? (data.global[0].value / totalGlobal) * 100 : 0;
  const isDark = document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('light');
  const tooltipBg = isDark ? '#0f172a' : '#f1f5f9';
  const tooltipText = isDark ? '#fff' : '#1e293b';
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickFill = isDark ? '#64748b' : '#475569';

  return (
    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-card))] backdrop-blur-md rounded-xl p-3 animate-in fade-in zoom-in-95 duration-500 shadow-lg space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2 border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] rounded text-[hsl(var(--accent))] flex items-center gap-1.5">
            <BarChart2 size={10} />
            <span className="text-[7px] font-black uppercase tracking-widest">Analytics Pro</span>
          </div>
        </div>
        <button onClick={onClose} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-500 font-black uppercase text-[7px] tracking-widest border border-red-500/20 transition-all active:scale-95">
          FECHAR
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center space-y-2">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Desempenho Geral</p>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.global} innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value">
                  {data.global.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: '6px', fontSize: '8px', color: tooltipText }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1 w-full max-w-[120px]">
            {data.global.map(g => (
              <div key={g.name} className="flex items-center justify-between text-[7px] font-bold">
                <span className="flex items-center gap-1.5 text-[hsl(var(--text-muted))]"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />{g.name}:</span>
                <span className="text-[hsl(var(--text-bright))] font-black">{totalGlobal > 0 ? ((g.value / totalGlobal) * 100).toFixed(1) + '%' : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Alternativas</p>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.alts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: tickFill, fontWeight: 'bold' }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {data.alts.map((entry, index) => <Cell key={`cell-${index}`} fill="hsl(188,80%,40%)" />)}
                </Bar>
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: '6px', fontSize: '8px', color: tooltipText }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 w-full text-[6.5px] font-black uppercase tracking-tight text-[hsl(var(--text-muted))]">
            {data.alts.map((a, i) => (
              <div key={`alt-row-${i}`} className="flex justify-between border-b border-[hsl(var(--border))] pb-0.5">
                <span>{a.name}:</span> <span className="text-[hsl(var(--text-bright))]">{a.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Meu Histórico</p>
          <div className="h-28 w-full flex items-center justify-center">
            {data.userStats && data.userStats.total > 0 ? (
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--border))]" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/40" style={{ clipPath: `conic-gradient(transparent 0%, transparent ${(1 - data.userStats.correct / data.userStats.total) * 100}%, currentColor ${(1 - data.userStats.correct / data.userStats.total) * 100}%, currentColor 100%)` }} />
                <div className="flex flex-col items-center">
                  <span className="text-[14px] font-black text-[hsl(var(--text-bright))] italic">{((data.userStats.correct / data.userStats.total) * 100).toFixed(0)}%</span>
                  <span className="text-[5px] text-[hsl(var(--text-muted))] uppercase font-black">Accuracy</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-3 rounded-xl border border-dashed border-[hsl(var(--border))]">
                <AlertOctagon size={14} className="mx-auto text-[hsl(var(--text-muted))] mb-1" />
                <p className="text-[hsl(var(--text-muted))] font-bold uppercase text-[6px] tracking-widest leading-tight">Sem dados</p>
              </div>
            )}
          </div>
          {data.userStats && data.userStats.total > 0 && (
            <div className="flex flex-col gap-0.5 w-full text-[7px] font-black uppercase tracking-tight text-[hsl(var(--text-muted))]">
              <div className="flex justify-between"><span>Tentativas:</span> <span className="text-[hsl(var(--text-bright))]">{data.userStats.total}</span></div>
              <div className="flex justify-between"><span>Sucessos:</span> <span className="text-emerald-500">{data.userStats.correct}</span></div>
              <div className="flex justify-between"><span>Falhas:</span> <span className="text-red-500">{data.userStats.total - data.userStats.correct}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-[hsl(var(--border))] flex justify-between text-[7px] font-black uppercase tracking-[0.1em] text-[hsl(var(--text-muted))]">
        <div className="flex items-center gap-1.5"><AlertOctagon size={10} className="text-[hsl(var(--accent))]" /> Dificuldade: <span className="text-[hsl(var(--text-bright))]">{correctRate > 75 ? 'Fácil' : correctRate > 50 ? 'Média' : 'Difícil'}</span></div>
        <div className="flex items-center gap-1.5"><Target size={10} className="text-[hsl(var(--accent-secondary))]" /> Total: <span className="text-[hsl(var(--text-bright))]">{totalGlobal} Resoluções</span></div>
        <div className="flex items-center gap-1.5"><Clock size={10} className="text-orange-500" /> Avg: <span className={data.avgTime != null ? 'text-[hsl(var(--text-bright))]' : 'text-[hsl(var(--text-muted))]'}>{data.avgTime != null ? `${data.avgTime}s` : 'N/A'}</span></div>
      </div>
    </div>
  );
};

interface QuestionCardProps {
  q: GlobalQuestion;
  isExpanded: boolean;
  isAdmin: boolean;
  onToggle: (id: string) => void;
  onEdit: (q: GlobalQuestion) => void;
  onDelete: (id: string) => void;
  onSolve: (q: GlobalQuestion, selectedAltId: string | null, tempo?: number) => void;
  // IA Lab Props
  selectedAI: AIProviderName | 'auto';
  setSelectedAI: (val: AIProviderName | 'auto') => void;
  aiStreamText: string;
  aiLoading: boolean;
  mnemonicText: string;
  mnemonicLoading: boolean;
  extraContent: string;
  extraLoading: boolean;
  activeAiTool: string;
  setActiveAiTool: (val: any) => void;
  onGenerateExplanation: (q: GlobalQuestion) => void;
  onGenerateMnemonic: (q: GlobalQuestion) => void;
  onGenerateExtra: (q: GlobalQuestion, format: any) => void;
  onSendFollowUp: (q: GlobalQuestion) => void;
  followUpQuery: string;
  setFollowUpQuery: (val: string) => void;
  isPlayingNeural: boolean;
  onPlayAudio: (q: GlobalQuestion, text: string) => void;
  onPlayPodcast: (q: GlobalQuestion) => void;
  handleExportLabPDF: (id: string) => void;
  isGeneratingPodcast: boolean;
  podcastStatus: string;
  podcastCache: Set<string>;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  q, isExpanded, isAdmin, onToggle, onEdit, onDelete, onSolve,
  selectedAI, setSelectedAI, aiStreamText, aiLoading, mnemonicText, mnemonicLoading,
  extraContent, extraLoading, activeAiTool, setActiveAiTool,
  onGenerateExplanation, onGenerateMnemonic, onGenerateExtra, onSendFollowUp,
  followUpQuery, setFollowUpQuery, isPlayingNeural, onPlayAudio, onPlayPodcast,
  handleExportLabPDF, isGeneratingPodcast, podcastStatus, podcastCache
}) => {
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [analyticsKey, setAnalyticsKey] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Reset timer when card expands
  useEffect(() => {
    if (isExpanded) startTimeRef.current = Date.now();
  }, [isExpanded]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAlt) return;
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setIsFlipped(true);
    onSolve(q, selectedAlt, elapsed);
    // Refresh analytics after a short delay to let Supabase register the insert
    if (showStats) setTimeout(() => setAnalyticsKey(k => k + 1), 800);
  };
  const statusInfo = {
    'Pendente': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', accent: 'bg-yellow-500' },
    'Revisado': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', accent: 'bg-blue-500' },
    'Dominado': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', accent: 'bg-green-500' },
  }[(q as any).status as 'Pendente' || 'Pendente'];

  return (
    <div className={`glass-premium rounded-lg overflow-hidden border transition-all duration-300 group ${isExpanded ? `border-[hsl(var(--accent)/0.3)] shadow-lg` : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.1)]'}`}>
      <div className="p-2 cursor-pointer" onClick={() => onToggle(q.id)}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest text-slate-500">
            <span className="text-cyan-400 px-1 py-0 border border-cyan-400/20">{q.materia}</span>
            <span className="opacity-20">•</span>
            <span className="text-slate-500">{q.banca}</span>
            <span className="opacity-20">•</span>
            <span className="text-slate-500">{q.ano}</span>
            {q.tec_id && (() => {
              const tecInfo = extractTecId(q.tec_id);
              if (!tecInfo) return null;
              return (
                <>
                  <span className="opacity-20">•</span>
                  <a
                    href={tecInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <Hash size={8} /> <span>{tecInfo.id}</span>
                  </a>
                </>
              );
            })()}
            <button
              onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); if (!isExpanded) onToggle(q.id); }}
              className={`ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all ${showStats ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'border-white/5 text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <BarChart2 size={8} /> <span className="text-[6px]">Estatísticas</span>
            </button>
          </div>
          <h4 className={`text-[10px] font-black uppercase tracking-tight transition-colors duration-300 ${isExpanded ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-bright))] group-hover:text-[hsl(var(--accent))]'}`}>
            {q.assunto}
          </h4>
        </div>
      </div>

      {showStats && q.alternativas && (
        <div className="px-2 pb-2 animate-in slide-in-from-top-2 duration-300">
          <QuestionAnalytics
            key={analyticsKey}
            questionId={q.id}
            alternativas={q.alternativas}
            onClose={() => setShowStats(false)}
          />
        </div>
      )}

      {isExpanded && (
        <div className="bg-black/10 border-t border-[hsl(var(--border))] p-2.5 space-y-3 animate-in slide-in-from-top-4 duration-300">
          <div className="prose prose-sm prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: isFlipped && q.resposta ? q.resposta : (q.enunciado || 'Enunciado não disponível') }} className="text-[10px] font-bold tracking-tight text-[hsl(var(--text-bright))] leading-tight" />
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {q.alternativas?.map((alt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedAlt === alt.id;

              let statusClasses = "border-white/5 hover:border-[hsl(var(--accent)/0.2)] hover:bg-white/5";
              if (isFlipped) {
                if (alt.is_correct) statusClasses = "border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.05)]";
                else if (isSelected) statusClasses = "border-red-500/50 bg-red-500/10 text-red-400";
                else statusClasses = "border-white/5 opacity-40";
              } else if (isSelected) {
                statusClasses = "border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.05)] text-[hsl(var(--accent))]";
              }

              return (
                <button
                  key={alt.id}
                  disabled={isFlipped}
                  onClick={(e) => { e.stopPropagation(); setSelectedAlt(alt.id); }}
                  className={`w-full flex gap-2 items-center px-2 py-1.5 rounded-lg border text-left transition-all group/alt ${statusClasses}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black transition-all ${isSelected ? 'bg-[hsl(var(--accent))] text-black' : 'bg-white/5 group-hover/alt:bg-white/10'}`}>
                    {letter}
                  </div>
                  <div className="flex-1 font-bold text-[9px] uppercase tracking-tight leading-tight">{alt.texto}</div>
                  {isFlipped && alt.is_correct && <CheckCircle2 size={12} className="text-green-500" />}
                  {isFlipped && isSelected && !alt.is_correct && <X size={12} className="text-red-500" />}
                </button>
              );
            })}
          </div>

          {!isFlipped ? (
            <button
              onClick={handleConfirm}
              disabled={!selectedAlt}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-black font-black uppercase tracking-widest text-[8px] shadow-lg active:scale-[0.98] disabled:opacity-20 transition-all font-sans"
            >
              Resolver Questão
            </button>
          ) : (
            <div className="flex gap-2 py-1.5 bg-white/5 rounded-lg border border-white/5 items-center justify-center">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Processado</span>
              <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setSelectedAlt(null); }} className="text-[8px] font-black uppercase text-[hsl(var(--accent))] hover:underline flex items-center gap-1 border-l border-white/10 pl-2">
                <RotateCcw size={10} /> Recomeçar
              </button>
            </div>
          )}

          {q.anotacoes && (
            <div className="space-y-2">
              <h5 className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={12} className="text-[hsl(var(--accent))]" /> Anotações Contextuais
              </h5>
              <div className="bg-[hsl(var(--bg-user-block))] p-3 rounded-xl border border-[hsl(var(--border))] text-[10px] font-bold text-[hsl(var(--text-main))] leading-normal whitespace-pre-wrap font-sans opacity-90">
                {formatTextWithLinks(q.anotacoes)}
              </div>
            </div>
          )}

          {/* LABORATÓRIO NEURAL (IA) */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
                  <Brain size={12} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Lab Neural</span>
              </div>

              <div className="flex gap-1 p-0.5 bg-black/40 rounded-lg border border-white/5 backdrop-blur-sm shadow-inner">
                {[
                  { id: 'explanation', icon: <Sparkles size={10} />, label: 'Análise', color: 'purple' },
                  { id: 'mnemonic', icon: <Music size={10} />, label: 'Mnemônico', color: 'orange' },
                  { id: 'mapa', icon: <MapIcon size={10} />, label: 'Mapa', color: 'emerald' },
                  { id: 'tabela', icon: <Table size={10} />, label: 'Tabela', color: 'cyan' }
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeAiTool === tool.id && (aiStreamText || mnemonicText || extraContent)) {
                        setActiveAiTool(null as any);
                      } else {
                        setActiveAiTool(tool.id as any);
                        if (tool.id === 'explanation' && !aiStreamText) onGenerateExplanation(q);
                        if (tool.id === 'mnemonic' && !mnemonicText && !q.ai_generated_assets?.mnemonic) onGenerateMnemonic(q);
                        if (['mapa', 'tabela'].includes(tool.id) && !q.ai_generated_assets?.[tool.id as any]) onGenerateExtra(q, tool.id as any);
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeAiTool === tool.id ? `bg-${tool.color}-600 text-white shadow-lg` : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {tool.icon} {tool.label}
                  </button>
                ))}
              </div>
            </div>

            {activeAiTool && (aiStreamText || mnemonicLoading || extraLoading || mnemonicText || extraContent || aiLoading) && (
              <div className="animate-in slide-in-from-bottom-2 duration-300 relative group/lab">
                <button onClick={() => setActiveAiTool(null as any)} className="absolute -top-2 -right-2 p-1.5 bg-slate-800 rounded-full border border-white/10 text-slate-400 hover:text-white z-10 opacity-0 group-hover/lab:opacity-100 transition-opacity">
                  <X size={10} />
                </button>

                {activeAiTool === 'explanation' && (
                  <AIContentBox
                    title="Análise Pro"
                    icon={<Sparkles size={12} />}
                    content={aiStreamText}
                    isLoading={aiLoading}
                    isMarkdown={true}
                    accentColor="purple"
                    activeTool="explanation"
                    onRegenerate={() => onGenerateExplanation(q)}
                    handleExportLabPDF={() => handleExportLabPDF(q.id)}
                  >
                    {aiStreamText && !aiLoading && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); onPlayAudio(q, aiStreamText); }}
                            disabled={isPlayingNeural}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[8px] uppercase tracking-widest transition-all ${isPlayingNeural ? 'bg-slate-800 text-slate-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                          >
                            <Headphones size={12} /> {isPlayingNeural ? "Ouvindo" : "Solo"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onPlayPodcast(q); }}
                            disabled={isGeneratingPodcast}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[8px] uppercase tracking-widest transition-all border ${isGeneratingPodcast ? 'bg-purple-600/10 border-purple-500/20 text-purple-400 animate-pulse' : (podcastCache.has(q.original_audio_id || q.id) ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400' : 'bg-purple-600/10 border-purple-500/20 text-purple-400')}`}
                          >
                            <Headphones size={12} /> {isGeneratingPodcast ? "Gerando" : (podcastCache.has(q.original_audio_id || q.id) ? "No ar!" : "Podcast")}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={followUpQuery}
                            onChange={(e) => setFollowUpQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSendFollowUp(q)}
                            placeholder="Dúvida rápida..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-slate-200 outline-none focus:border-purple-500/30 pr-8"
                          />
                          <button onClick={() => onSendFollowUp(q)} disabled={!followUpQuery.trim() || aiLoading} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 disabled:opacity-20"><Send size={12} /></button>
                        </div>
                      </div>
                    )}
                  </AIContentBox>
                )}

                {activeAiTool === 'mnemonic' && (
                  <AIContentBox
                    title="Mnemônico"
                    icon={<Music size={12} />}
                    content={mnemonicText || q.ai_generated_assets?.mnemonic || ''}
                    isLoading={mnemonicLoading}
                    isMarkdown={true}
                    accentColor="orange"
                    activeTool="mnemonic"
                    onRegenerate={() => onGenerateMnemonic(q)}
                    handleExportLabPDF={() => handleExportLabPDF(q.id)}
                  />
                )}

                {(['mapa', 'tabela'] as const).includes(activeAiTool as any) && (
                  <AIContentBox
                    title={activeAiTool.toUpperCase()}
                    icon={activeAiTool === 'mapa' ? <MapIcon size={12} /> : <Table size={12} />}
                    content={extraContent || q.ai_generated_assets?.[activeAiTool as keyof typeof q.ai_generated_assets] || ''}
                    isLoading={extraLoading}
                    isMarkdown={true}
                    accentColor={activeAiTool === 'mapa' ? 'emerald' : 'cyan'}
                    activeTool={activeAiTool}
                    onRegenerate={() => onGenerateExtra(q, activeAiTool as any)}
                    handleExportLabPDF={() => handleExportLabPDF(q.id)}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(q); }} className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-cyan-400 border border-white/5 transition-all"><Edit size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(q.id); }} className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-red-400 border border-white/5 transition-all"><Trash2 size={12} /></button>
                </>
              )}
            </div>
            {q.simulado && <span className="text-[7px] font-black bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] px-3 py-1 rounded-full border border-[hsl(var(--accent)/0.2)] uppercase tracking-widest">{q.simulado}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva, editais, initialTab = 'gerador' }) => {
  const [questions, setQuestions] = useState<GlobalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeBankTab, setActiveBankTab] = useState<'gerador' | 'cadastro'>(initialTab);

  useEffect(() => {
    setActiveBankTab(initialTab);
  }, [initialTab]);

  // Filtros Avançados
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMateria, setFilterMateria] = useState<string>('Todas');
  const [filterAssunto, setFilterAssunto] = useState<string>('Todos');
  const [filterBanca, setFilterBanca] = useState<string>('Todas');
  const [filterAno, setFilterAno] = useState<string>('Todos');
  const [filterOrgao, setFilterOrgao] = useState<string>('Todos');
  const [filterCargo, setFilterCargo] = useState<string>('Todos');
  const [filterPodcast, setFilterPodcast] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);

  // Podcast States
  const [podcastCache, setPodcastCache] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState("");

  // Form States
  const initialFormState = {
    data: getLocalToday(),
    materia: '',
    assunto: '',
    banca: '',
    ano: new Date().getFullYear(),
    orgao: '',
    cargo: '',
    enunciado: '',
    resposta: '',
    anotacoes: '',
    tags: '',
    tipo: 'Multipla Escolha' as Question['tipo'],
    alternativas: [] as Question['alternativas'],
    tec_id: '',
    gabarito_oficial: '' as string,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'study'>('study');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleSmartPaste = (text: string) => {
    setSmartPasteText(text);
    if (!text.trim()) return;

    // Regex para identificar A), A -, [A], A. etc no início da linha
    // Ou apenas a letra seguida de nova linha
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const newAlts: any[] = [];
    let currentAltText = '';
    let currentLabel = '';

    // Regex mais flexível para identificar A), A., A-, [A] ou apenas "A" isolado na linha
    const labelRegex = /^([A-E]|[a-e])([\)\.\-\s]|$)/;

    lines.forEach((line) => {
      const match = line.match(labelRegex);
      if (match) {
        // Se já tínhamos uma alternativa sendo formada, salva ela
        if (currentLabel) {
          newAlts.push({
            id: Math.random().toString(36).substr(2, 9),
            label: currentLabel.toUpperCase(),
            texto: currentAltText.trim(),
            is_correct: false
          });
        }
        currentLabel = match[1];
        // Remove a etiqueta e possíveis separadores do início do texto
        currentAltText = line.replace(/^([A-E]|[a-e])[\)\.\-\s]*/i, '').trim();
      } else if (currentLabel) {
        // Se não tem match mas temos uma letra ativa, acumula o texto
        currentAltText += (currentAltText ? ' ' : '') + line;
      }
    });

    // Adiciona a última
    if (currentLabel) {
      newAlts.push({
        id: Math.random().toString(36).substr(2, 9),
        label: currentLabel.toUpperCase(),
        texto: currentAltText.trim(),
        is_correct: false
      });
    }

    if (newAlts.length > 0) {
      setFormData(prev => ({
        ...prev,
        alternativas: newAlts,
        tipo: 'Multipla Escolha'
      }));
    }
  };
  const [selectedAI, setSelectedAI] = useState<AIProviderName | 'auto'>('auto');
  const [aiStreamText, setAiStreamText] = useState<string>("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mnemonicText, setMnemonicText] = useState<string>("");
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [extraFormat, setExtraFormat] = useState<'mapa' | 'fluxo' | 'tabela' | 'info' | null>(null);
  const [extraContent, setExtraContent] = useState<string>('');
  const [extraLoading, setExtraLoading] = useState<boolean>(false);
  const [isPlayingNeural, setIsPlayingNeural] = useState(false);
  const [stopNeural, setStopNeural] = useState<(() => void) | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeAiTool, setActiveAiTool] = useState<'explanation' | 'mnemonic' | 'mapa' | 'fluxo' | 'tabela' | 'info'>('explanation');
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [groqKeyAvailable, setGroqKeyAvailable] = useState(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setGeminiKeyAvailable(!!getGeminiKey());
    setGroqKeyAvailable(!!getGroqKey());
  }, []);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error } = await supabase.storage
        .from('questions')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found')) {
          alert('Bucket "questions" não encontrado. Crie o bucket no Supabase Storage primeiro.');
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('questions')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const createEditorProps = (targetEditor: string) => ({
    attributes: {
      class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-6 text-[hsl(var(--text-bright))]'
    },
    handlePaste: (view: any, event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image'));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          handleImageUpload(file).then(url => {
            if (url && (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)) {
              (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)?.chain().focus().setImage({ src: url }).run();
            }
          });
          return true;
        }
      }
      return false;
    },
    handleDrop: (view: any, event: DragEvent) => {
      const files = Array.from(event.dataTransfer?.files || []);
      const imageFile = files.find(file => file.type.startsWith('image'));

      if (imageFile) {
        handleImageUpload(imageFile).then(url => {
          if (url && (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)) {
            (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)?.chain().focus().setImage({ src: url }).run();
          }
        });
        return true;
      }
      return false;
    }
  });

  // Tiptap Editors
  const enunciadoEditor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      Image,
      Placeholder.configure({ placeholder: 'Digite o enunciado...' })
    ],
    content: formData.enunciado,
    onUpdate: ({ editor }) => setFormData(prev => ({ ...prev, enunciado: editor.getHTML() })),
    editorProps: createEditorProps('enunciado'),
  });

  const respostaEditor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      Image,
      Placeholder.configure({ placeholder: 'Digite o gabarito comentado...' })
    ],
    content: formData.resposta,
    onUpdate: ({ editor }) => setFormData(prev => ({ ...prev, resposta: editor.getHTML() })),
    editorProps: createEditorProps('resposta'),
  });

  useEffect(() => {
    if (isEditing && showForm) {
      enunciadoEditor?.commands.setContent(formData.enunciado || '');
      respostaEditor?.commands.setContent(formData.resposta || '');
    } else if (!isEditing && showForm) {
      enunciadoEditor?.commands.setContent('');
      respostaEditor?.commands.setContent('');
    }
  }, [isEditing, showForm]);


  const syncPodcastCache = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.storage.from('audio-revisions').list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      if (error) { console.error("Erro ao listar áudios:", error); return; }
      if (data) {
        const podcastIds = new Set<string>();
        let count = 0;
        data.forEach((file: any) => {
          if (file.name && file.name.endsWith('_podcast.wav')) {
            const id = file.name.replace('_podcast.wav', '');
            podcastIds.add(id);
            count++;
          }
        });
        console.log(`✅ Sincronização: ${count} podcasts identificados no servidor.`);
        setPodcastCache(podcastIds);
      }
    } catch (e) { console.error("Erro exceção sync podcast:", e); } finally { setIsSyncing(false); }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUser(user);

    try {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (user.email === 'fernandobritosc@gmail.com' || profile?.is_admin === true) setIsAdmin(true);
    } catch (e) { }

    const { data, error } = await supabase.from('banco_questoes').select('*').order('created_at', { ascending: false });
    if (!error) setQuestions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
    syncPodcastCache();
  }, [missaoAtiva]);

  const reviewQueue = useMemo(() => {
    let filtered = questions;
    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.materia.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterMateria !== 'Todas') filtered = filtered.filter(q => q.materia === filterMateria);
    if (filterAssunto !== 'Todos') filtered = filtered.filter(q => q.assunto === filterAssunto);
    if (filterBanca !== 'Todas') filtered = filtered.filter(q => q.banca === filterBanca);
    if (filterAno !== 'Todos') filtered = filtered.filter(q => q.ano === Number(filterAno));
    if (filterOrgao !== 'Todos') filtered = filtered.filter(q => q.orgao === filterOrgao);
    if (filterCargo !== 'Todos') filtered = filtered.filter(q => q.cargo === filterCargo);

    if (filterPodcast === 'Com Podcast') {
      filtered = filtered.filter(q => podcastCache.has(q.original_audio_id || q.id));
    } else if (filterPodcast === 'Sem Podcast') {
      filtered = filtered.filter(q => !podcastCache.has(q.original_audio_id || q.id));
    }

    return [...filtered].sort((a, b) => (Number(b.relevancia) || 0) - (Number(a.relevancia) || 0));
  }, [questions, searchTerm, filterMateria, filterAssunto, filterBanca, filterAno, filterOrgao, filterCargo, filterPodcast, podcastCache]);

  const currentQuestion = viewMode === 'study' ? reviewQueue[currentQuestionIndex] : null;

  useEffect(() => {
    if (currentQuestion?.id !== lastQuestionIdRef.current) {
      // Load cached AI assets from DB
      const cached = currentQuestion?.ai_generated_assets;
      setAiStreamText(cached?.explanation || "");
      setMnemonicText(cached?.mnemonic || "");
      setExtraContent("");
      setAiLoading(false);
      setMnemonicLoading(false);
      setExtraLoading(false);
      setExtraFormat(null);
      setFollowUpQuery("");
      setActiveAiTool('explanation');
      if (stopNeural) stopNeural();
      setIsPlayingNeural(false);
      lastQuestionIdRef.current = currentQuestion?.id || null;
    }
  }, [currentQuestion?.id]);

  // Accumulator ref to capture full stream text for saving
  const streamAccRef = useRef<string>("");

  const saveAiAsset = async (questionId: string, assetType: string, content: string) => {
    try {
      const q = questions.find(item => item.id === questionId);
      if (!q) return;

      const updatedAssets = {
        ...(q.ai_generated_assets || {}),
        [assetType]: content
      };

      const { error } = await supabase
        .from('banco_questoes')
        .update({ ai_generated_assets: updatedAssets })
        .eq('id', questionId);

      if (error) throw error;
      setQuestions(prev => prev.map(item => item.id === questionId ? { ...item, ai_generated_assets: updatedAssets } : item));
    } catch (err) {
      console.error("Erro ao salvar asset da IA:", err);
    }
  };

  const generateAIExplanation = async (question: GlobalQuestion) => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiStreamText("");
    streamAccRef.current = "";
    setActiveAiTool('explanation');

    const prompt = `Analise a seguinte questão de concurso e forneça uma explicação detalhada, comentando cada alternativa e explicando por que a correta é a correta.
                                Banca: ${question.banca || 'N/A'}
                                Órgão: ${question.orgao || 'N/A'}
                                Ano: ${question.ano || 'N/A'}
                                Enunciado: ${question.enunciado}
                                Alternativas: ${JSON.stringify(question.alternativas)}`;

    try {
      await streamAIContent(
        prompt,
        {
          onChunk: (chunk) => {
            streamAccRef.current += chunk;
            setAiStreamText(prev => prev + chunk);
          },
          onComplete: async () => {
            setAiLoading(false);
            // Auto-save completed explanation to DB cache
            if (streamAccRef.current) {
              await saveAiAsset(question.id, 'explanation', streamAccRef.current);
            }
          },
          onError: (err) => {
            console.error(err);
            setAiLoading(false);
          }
        },
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI
      );
    } catch (err) {
      setAiLoading(false);
    }
  };

  const handleGenerateMnemonic = async (question: GlobalQuestion) => {
    if (mnemonicLoading) return;
    setMnemonicLoading(true);
    setActiveAiTool('mnemonic');

    const prompt = `Crie um mnemônico ou uma rima curta e infalível para ajudar a memorizar o conceito principal desta questão:\n\n${question.enunciado}`;

    try {
      const content = await generateAIContent(
        prompt,
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI,
        'flashcard'
      );
      setMnemonicText(content);
      await saveAiAsset(question.id, 'mnemonic', content);
    } catch (err) {
      console.error(err);
    } finally {
      setMnemonicLoading(false);
    }
  };

  const handleGenerateExtraFormat = async (question: GlobalQuestion, format: 'mapa' | 'fluxo' | 'tabela' | 'info') => {
    if (extraLoading) return;
    setExtraLoading(true);
    setExtraFormat(format);
    setActiveAiTool(format);

    try {
      const content = await generateAIContent(
        question.enunciado || '',
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI,
        format
      );
      setExtraContent(content);
      await saveAiAsset(question.id, format, content);
    } catch (err) {
      console.error(err);
    } finally {
      setExtraLoading(false);
    }
  };

  const handleSendFollowUp = async (question: GlobalQuestion) => {
    if (!followUpQuery.trim() || aiLoading) return;
    const query = followUpQuery;
    setFollowUpQuery("");
    setAiLoading(true);
    setAiStreamText(prev => prev + `\n\n--- \n**Pergunta:** ${query}\n\n`);

    try {
      await streamAIContent(
        `Com base na questão anterior, responda à seguinte dúvida: ${query}`,
        {
          onChunk: (chunk) => setAiStreamText(prev => prev + chunk),
          onComplete: () => setAiLoading(false),
          onError: (err) => {
            console.error(err);
            setAiLoading(false);
          }
        },
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI
      );
    } catch (err) {
      setAiLoading(false);
    }
  };

  const handlePlayNeural = async (question: GlobalQuestion, text: string) => {
    if (isPlayingNeural && stopNeural) {
      stopNeural();
      setIsPlayingNeural(false);
      return;
    }

    const stop = await handlePlayRevisionAudio(
      text,
      question.id,
      getGeminiKey() || '',
      () => setIsPlayingNeural(true),
      () => setIsPlayingNeural(false),
      () => setIsPlayingNeural(false)
    );
    setStopNeural(() => stop);
  };

  const handlePodcastDuo = async (question: GlobalQuestion) => {
    if (isGeneratingPodcast) return;
    const audioIdToUse = question.original_audio_id || question.id;
    setIsGeneratingPodcast(true);

    const stop = await generatePodcastAudio(
      aiStreamText || question.enunciado || '',
      audioIdToUse,
      getGeminiKey() || '',
      setPodcastStatus,
      () => {
        setIsGeneratingPodcast(false);
        setIsPlayingNeural(true);
        setPodcastCache(prev => new Set(prev).add(audioIdToUse));
      },
      () => setIsPlayingNeural(false),
      () => {
        setIsGeneratingPodcast(false);
        setIsPlayingNeural(false);
      }
    );
    setStopNeural(() => stop);
  };

  const handleExportLabPDF = async (questionId: string) => {
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('neural-content-box');
      const viewport = element?.querySelector('.neural-content-viewport') as HTMLElement;

      if (!element || !viewport) {
        alert("Erro: Conteúdo do Laboratório não encontrado.");
        return;
      }

      // Map tool names to Portuguese
      const toolLabels: Record<string, string> = {
        'explanation': 'EXPLICAÇÃO DETALHADA',
        'mnemonic': 'MNEMÔNICO & MEMORIZAÇÃO',
        'map': 'MAPA MENTAL ESTRUTURADO',
        'table': 'TABELA COMPARATIVA TÉCNICA',
        'info': 'INFOGRÁFICO RESUMIDO',
        'fluxo': 'FLUXOGRAMA DE PROCESSOS'
      };

      // Find question info for the header
      const question = questions.find(q => q.id === questionId);
      const subject = question?.assunto || 'Assunto Geral';

      // Preparação para captura total
      const originalMaxHeight = viewport.style.maxHeight;
      const originalOverflow = viewport.style.overflowY;

      viewport.style.maxHeight = 'none';
      viewport.style.overflowY = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('neural-content-box');
          if (clonedElement) {
            // Force core container to be invisible/paper-white
            clonedElement.style.backgroundColor = 'transparent';
            clonedElement.style.color = '#000000';
            clonedElement.style.border = 'none';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.padding = '0';

            // Hard exclusion of UI artifacts
            const toHide = clonedElement.querySelectorAll('.pdf-exclude, button, .lucide');
            toHide.forEach((el: any) => el.style.display = 'none');

            // Force EVERY descendant to high-contrast black and transparent background
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el: any) => {
              const style = (el as HTMLElement).style;
              style.color = '#000000';
              style.backgroundColor = 'transparent';
              style.borderColor = '#000000';
              style.boxShadow = 'none';
              style.textShadow = 'none';
              style.transition = 'none';
              style.animation = 'none';

              // Remove gradient text effects
              if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') {
                style.webkitBackgroundClip = 'initial';
                style.backgroundClip = 'initial';
                style.backgroundImage = 'none';
              }
            });

            // Ensure the viewport is fully expanded and clean
            const viewportClone = clonedElement.querySelector('.neural-content-viewport') as HTMLElement;
            if (viewportClone) {
              viewportClone.style.maxHeight = 'none';
              viewportClone.style.overflow = 'visible';
              viewportClone.style.padding = '0';
              viewportClone.style.margin = '0';
            }
          }
        }
      });

      viewport.style.maxHeight = originalMaxHeight;
      viewport.style.overflowY = originalOverflow;

      // SIZE OPTIMIZATION: JPEG with 0.7 quality instead of PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const { jsPDF } = await import('jspdf');

      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      const margin = 40;
      const headerHeight = 70;
      const footerHeight = 30;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeightPerPage = pdfHeight - (margin * 2) - headerHeight - footerHeight;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // COMPRESSION: Use internal jsPDF compression
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const drawHeader = (pNum: number) => {
        // Professional background
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pdfWidth, headerHeight + 10, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(margin, headerHeight + 5, pdfWidth - margin, headerHeight + 5);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont("helvetica", "bold");
        doc.text((missaoAtiva || "MONITOR PRO").toUpperCase(), margin, 25);

        doc.setFontSize(10);
        doc.setTextColor(147, 51, 234); // purple-600
        const toolLabel = `LAB NEURAL: ${toolLabels[activeAiTool] || activeAiTool.toUpperCase()}`;
        doc.text(toolLabel, margin, 42);

        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(subject.toUpperCase(), margin, 58);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`PÁGINA ${pNum}`, pdfWidth - margin - 45, 25);
      };

      const drawFooter = () => {
        doc.setFontSize(6);
        doc.setTextColor(203, 213, 225);
        doc.text("GERADO AUTOMATICAMENTE POR MONITOR PRO AI - ALTA PERFORMANCE", pdfWidth / 2, pdfHeight - 15, { align: "center" });
      };

      let heightLeft = imgHeight;
      let pNum = 1;

      // Page 1
      drawHeader(pNum);
      drawFooter();
      doc.addImage(imgData, 'JPEG', margin, margin + headerHeight, imgWidth, imgHeight, undefined, 'FAST');

      heightLeft -= contentHeightPerPage;

      while (heightLeft > 0) {
        doc.addPage();
        pNum++;

        // Exact position with 1px overlap to prevent blank lines
        const sliceY = margin + headerHeight - (pNum - 1) * contentHeightPerPage;

        doc.addImage(imgData, 'JPEG', margin, sliceY, imgWidth, imgHeight, undefined, 'FAST');

        // Redraw Header & White box to cover bleed
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pdfWidth, margin + headerHeight, 'F');
        drawHeader(pNum);

        // Redraw Footer & White box to cover bleed
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pdfHeight - margin - footerHeight, pdfWidth, margin + footerHeight, 'F');
        drawFooter();

        heightLeft -= contentHeightPerPage;
      }

      const fileName = `Laboratorio_Neural_${activeAiTool}_${questionId.substring(0, 5)}.pdf`;
      doc.save(fileName);
    } catch (err: any) {
      console.error("Erro ao exportar PDF:", err);
      alert("Erro ao exportar PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  const getActiveProviderName = () => {
    if (selectedAI !== 'auto') return selectedAI.toUpperCase();
    const gemini = getGeminiKey();
    if (gemini && gemini.length > 10) return 'GEMINI 2.0';
    return 'GROQ';
  };

  const savedMaterias = useMemo(() => Array.from(new Set(questions.map(q => q.materia).filter(Boolean))).sort(), [questions]);
  const savedAssuntosGerais = useMemo(() => Array.from(new Set(questions.map(q => q.assunto))).sort(), [questions]);
  const savedBancas = useMemo(() => Array.from(new Set(questions.map(q => q.banca || '').filter(Boolean))).sort(), [questions]);
  const savedAnos = useMemo(() => Array.from(new Set(questions.map(q => q.ano || 0).filter(Boolean))).sort((a, b) => b - a), [questions]);
  const savedOrgaos = useMemo(() => Array.from(new Set(questions.map(q => q.orgao || '').filter(Boolean))).sort(), [questions]);
  const savedCargos = useMemo(() => Array.from(new Set(questions.map(q => q.cargo || '').filter(Boolean))).sort(), [questions]);

  // Assuntos filtrados pela matéria selecionada no form — sempre do banco, nunca do edital
  const topicosSugeridos = useMemo(() => {
    const selectedMateria = formData.materia?.trim().toLowerCase();
    if (!selectedMateria) return savedAssuntosGerais;
    // Filtra assuntos do banco que correspondem à matéria selecionada (case-insensitive)
    const fromDB = Array.from(new Set(
      questions
        .filter(q => q.materia?.trim().toLowerCase() === selectedMateria)
        .map(q => q.assunto)
        .filter(Boolean)
    )).sort();
    return fromDB.length > 0 ? fromDB : savedAssuntosGerais;
  }, [formData.materia, questions, savedAssuntosGerais]);

  const handleEdit = (q: GlobalQuestion) => {
    const correctIndex = q.alternativas?.findIndex(a => a.is_correct);
    const letter = (correctIndex !== undefined && correctIndex !== -1) ? String.fromCharCode(65 + correctIndex) : '';

    setIsEditing(q.id);
    setActiveBankTab('cadastro');
    setFormData({
      ...initialFormState,
      ...q,
      alternativas: q.alternativas || [],
      tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
      gabarito_oficial: letter,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(null);
    setFormData(initialFormState);
  };

  const logAttempt = async (question: GlobalQuestion, selectedAltId: string | null, tempo?: number) => {
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) { console.warn('[logAttempt] No user session'); return; }
      const isCorrect = question.alternativas?.find(a => a.id === selectedAltId)?.is_correct || false;
      console.log('[logAttempt] Saving attempt:', question.id, selectedAltId, isCorrect, tempo);

      const payload: any = {
        user_id: user.id,
        question_id: question.id,
        selected_alt: selectedAltId || 'N/A',
        is_correct: isCorrect,
        materia: question.materia,
        assunto: question.assunto,
        banca: question.banca,
        tempo_resposta: tempo ?? null
      };

      const { error } = await supabase.from('questao_tentativas').insert([payload]);

      if (error) {
        console.warn('[logAttempt] Insert error (tentando sem tempo_resposta):', error.message);
        // Fallback: insert sem tempo_resposta caso a coluna não exista ainda
        const { tempo_resposta, ...payloadSemTempo } = payload;
        const { error: error2 } = await supabase.from('questao_tentativas').insert([payloadSemTempo]);
        if (error2) console.error('[logAttempt] Falha definitiva no insert:', error2.message);
        else console.log('[logAttempt] Saved (sem tempo_resposta)');
      } else {
        console.log('[logAttempt] Saved OK');
      }
    } catch (e) {
      console.error('[logAttempt] Exceção:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return;

    const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean), created_by: user.id };
    delete (payload as any).gabarito_oficial;

    const { error } = isEditing
      ? await supabase.from('banco_questoes').update(payload).eq('id', isEditing)
      : await supabase.from('banco_questoes').insert([payload]);

    if (!error) { handleCancel(); fetchQuestions(); }
    else alert('Erro: ' + error.message);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm("Excluir questão?")) return;
    await supabase.from('banco_questoes').delete().eq('id', id);
    fetchQuestions();
  };

  const toggleCard = (id: string) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      {/* Minimalist Lab Header (Generator Only) */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-glow">
          <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-[hsl(var(--bg-main))] shadow-inner">
            <Brain size={7} />
          </div>
          <p className="text-[7px] font-black uppercase text-white/70 tracking-widest leading-none">Lab Neural</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-0.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[5.5px] font-bold text-slate-500 uppercase tracking-widest">Banco Sincronizado</span>
        </div>
      </div>

      {activeBankTab === 'gerador' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Barra de Busca & Filtros Compacta */}
          <div className="glass-premium p-1.5 rounded-lg border border-[hsl(var(--border))] flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={9} />
                <input
                  type="text"
                  placeholder="Pesquisar questões..."
                  className="w-full bg-white/5 border border-white/5 rounded-md pl-7 pr-2 py-1 text-[8px] font-bold text-[hsl(var(--text-bright))] focus:border-cyan-500/50 outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-2 rounded-md border flex items-center gap-1 transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <Layers size={9} />
                {showFilters ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
              </button>
              <button
                onClick={syncPodcastCache}
                disabled={isSyncing}
                className="px-2 rounded-md border border-white/5 bg-white/5 text-slate-400 hover:text-white transition-all outline-none"
                title="Sincronizar Áudios"
              >
                <RefreshCw size={9} className={isSyncing ? 'animate-spin text-cyan-400' : ''} />
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 pb-1 animate-in slide-in-from-top-2 duration-300">
                {[
                  { label: 'Matéria', val: filterMateria, set: setFilterMateria, list: savedMaterias },
                  { label: 'Assunto', val: filterAssunto, set: setFilterAssunto, list: savedAssuntosGerais },
                  { label: 'Banca', val: filterBanca, set: setFilterBanca, list: savedBancas },
                  { label: 'Orgão', val: filterOrgao, set: setFilterOrgao, list: savedOrgaos },
                  { label: 'Cargo', val: filterCargo, set: setFilterCargo, list: savedCargos },
                  { label: 'Ano', val: filterAno, set: setFilterAno, list: savedAnos },
                  { label: 'Podcast', val: filterPodcast, set: setFilterPodcast, list: ['Todos', 'Com Podcast', 'Sem Podcast'] }
                ].map(f => (
                  <div key={f.label} className="space-y-1">
                    <label className="text-[6px] font-black text-slate-500 uppercase tracking-widest ml-1">{f.label}</label>
                    <input
                      type="text"
                      list={`list-${f.label}`}
                      className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-[8px] font-bold text-slate-300"
                      value={f.val === 'Todas' || f.val === 'Todos' ? '' : f.val}
                      placeholder="Qualquer"
                      onChange={e => f.set(e.target.value || (f.label === 'Ano' ? 'Todos' : (f.label === 'Assunto' || f.label === 'Orgão' || f.label === 'Cargo' ? 'Todos' : 'Todas')))}
                    />
                    <datalist id={`list-${f.label}`}>
                      {f.list.map((item, i) => <option key={i} value={item.toString()} />)}
                    </datalist>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Listagem Control Headers */}
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-[7px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
              <Brain size={9} className="text-[hsl(var(--accent))]" />
              {viewMode === 'study' ? `Foco (${currentQuestionIndex + 1}/${reviewQueue.length})` : `Resultados (${reviewQueue.length})`}
            </h3>
            <div className="flex gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-md">
              <button
                onClick={() => {
                  setViewMode('study');
                  setCurrentQuestionIndex(0);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[6.5px] font-black uppercase tracking-widest transition-all ${viewMode === 'study' ? 'bg-[hsl(var(--accent))] text-black' : 'text-slate-500 hover:text-white'}`}
              >
                <Brain size={8} /> Estudo
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[6.5px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-[hsl(var(--accent))] text-black' : 'text-slate-500 hover:text-white'}`}
              >
                <Layers size={8} /> Lista
              </button>
            </div>
          </div>

          {/* Listagem or Study Mode */}
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {loading ? (
                <p className="text-center py-10 text-[10px] uppercase font-black tracking-widest animate-pulse">Carregando...</p>
              ) : reviewQueue.map(q => (
                <QuestionCard
                  key={q.id} q={q} isExpanded={!!expandedCards[q.id]} isAdmin={isAdmin}
                  onToggle={toggleCard} onDelete={handleDelete} onSolve={logAttempt}
                  onEdit={handleEdit}
                  selectedAI={selectedAI}
                  setSelectedAI={setSelectedAI}
                  aiStreamText={aiStreamText}
                  aiLoading={aiLoading}
                  mnemonicText={mnemonicText}
                  mnemonicLoading={mnemonicLoading}
                  extraContent={extraContent}
                  extraLoading={extraLoading}
                  activeAiTool={activeAiTool}
                  setActiveAiTool={setActiveAiTool}
                  onGenerateExplanation={generateAIExplanation}
                  onGenerateMnemonic={handleGenerateMnemonic}
                  onGenerateExtra={handleGenerateExtraFormat}
                  onSendFollowUp={handleSendFollowUp}
                  followUpQuery={followUpQuery}
                  setFollowUpQuery={setFollowUpQuery}
                  isPlayingNeural={isPlayingNeural}
                  onPlayAudio={handlePlayNeural}
                  onPlayPodcast={handlePodcastDuo}
                  handleExportLabPDF={handleExportLabPDF}
                  isGeneratingPodcast={isGeneratingPodcast}
                  podcastStatus={podcastStatus}
                  podcastCache={podcastCache}
                />
              ))}
              {!loading && reviewQueue.length === 0 && (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
                  <AlertOctagon size={24} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-slate-600 font-black uppercase text-[8px] tracking-widest">Nenhuma questão encontrada</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.length > 0 ? (
                <div className="space-y-3 animate-in zoom-in-95 duration-500">
                  {/* Progress Bar Extreme */}
                  <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      style={{ width: `${((currentQuestionIndex + 1) / reviewQueue.length) * 100}%` }}
                    />
                  </div>

                  <QuestionCard
                    key={reviewQueue[currentQuestionIndex].id}
                    q={reviewQueue[currentQuestionIndex]}
                    isExpanded={true}
                    isAdmin={isAdmin}
                    onToggle={() => { }}
                    onDelete={handleDelete}
                    onSolve={logAttempt}
                    onEdit={handleEdit}
                    selectedAI={selectedAI}
                    setSelectedAI={setSelectedAI}
                    aiStreamText={aiStreamText}
                    aiLoading={aiLoading}
                    mnemonicText={mnemonicText}
                    mnemonicLoading={mnemonicLoading}
                    extraContent={extraContent}
                    extraLoading={extraLoading}
                    activeAiTool={activeAiTool}
                    setActiveAiTool={setActiveAiTool}
                    onGenerateExplanation={generateAIExplanation}
                    onGenerateMnemonic={handleGenerateMnemonic}
                    onGenerateExtra={handleGenerateExtraFormat}
                    onSendFollowUp={handleSendFollowUp}
                    followUpQuery={followUpQuery}
                    setFollowUpQuery={setFollowUpQuery}
                    isPlayingNeural={isPlayingNeural}
                    onPlayAudio={handlePlayNeural}
                    onPlayPodcast={handlePodcastDuo}
                    handleExportLabPDF={handleExportLabPDF}
                    isGeneratingPodcast={isGeneratingPodcast}
                    podcastStatus={podcastStatus}
                    podcastCache={podcastCache}
                  />

                  {/* Navigation Controls Ultra-Compact */}
                  <div className="glass p-1.5 rounded-xl border border-[hsl(var(--accent)/0.1)] flex justify-between items-center shadow-lg">
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-10"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                      {currentQuestionIndex + 1} / {reviewQueue.length}
                    </span>

                    <button
                      disabled={currentQuestionIndex === reviewQueue.length - 1}
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[hsl(var(--accent))] text-black rounded-lg font-black uppercase text-[8px] tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                      Próxima <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
                  <AlertOctagon size={24} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-slate-600 font-black uppercase text-[8px] tracking-widest">Filtre as questões para iniciar o estudo</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeBankTab === 'cadastro' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {!(showForm || isEditing) ? (
            <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--accent)/0.1)] flex items-center justify-center text-[hsl(var(--accent))] animate-pulse">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest">Gestão do Banco</h3>
                <p className="text-slate-600 font-bold text-[7px] uppercase tracking-widest mt-1">Clique para novo registro</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-6 py-2 bg-[hsl(var(--accent))] text-black rounded-lg font-black uppercase text-[8px] tracking-widest transition-all hover:scale-105 shadow-lg active:scale-95 shadow-cyan-500/10"
              >
                <Plus size={14} /> Nova Questão
              </button>
            </div>
          ) : (
            <div className="glass-premium p-4 rounded-2xl border border-[hsl(var(--accent)/0.3)] shadow-2xl relative">
              <button onClick={handleCancel} className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={14} /></button>
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                {isEditing ? 'Editar Registro' : 'Novo Cadastro'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  {[
                    { field: 'tec_id', label: 'ID/URL TEC', list: null },
                    { field: 'banca', label: 'Banca', list: savedBancas },
                    { field: 'ano', label: 'Ano', list: savedAnos },
                    { field: 'orgao', label: 'Orgão', list: savedOrgaos },
                    { field: 'cargo', label: 'Cargo', list: savedCargos }
                  ].map(item => (
                    <div key={item.field} className="space-y-1">
                      <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        list={item.list ? `list-form-${item.field}` : undefined}
                        placeholder={item.field === 'tec_id' ? 'Ex: 123456' : ''}
                        className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-lg px-2.5 py-1.5 text-[9px] font-bold text-[hsl(var(--text-bright))] focus:border-[hsl(var(--accent)/0.5)] transition-all"
                        value={(formData as any)[item.field]}
                        onChange={e => setFormData({ ...formData, [item.field]: item.field === 'ano' ? (parseInt(e.target.value) || '') : e.target.value })}
                      />
                      {item.list && (
                        <datalist id={`list-form-${item.field}`}>
                          {item.list.map((val, i) => <option key={i} value={val.toString()} />)}
                        </datalist>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['materia', 'assunto'].map(field => (
                    <div key={field} className="space-y-1">
                      <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest">{field}</label>
                      <input
                        type="text"
                        list={`list-form-${field}`}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-[hsl(var(--text-bright))] focus:border-[hsl(var(--accent)/0.5)] transition-all"
                        value={(formData as any)[field]}
                        onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                      />
                      <datalist id={`list-form-${field}`}>
                        {(field === 'materia' ? savedMaterias : topicosSugeridos).map((item, i) => <option key={i} value={item} />)}
                      </datalist>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest flex items-center gap-1.5">
                    Enunciado <span className="text-[6px] opacity-30 uppercase font-bold">(Imagens & Rich Text)</span>
                  </label>
                  <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.3)] transition-all shadow-inner">
                    <EditorToolbar
                      editor={enunciadoEditor}
                      onImageUpload={(file) => handleImageUpload(file).then(url => url && enunciadoEditor?.chain().focus().setImage({ src: url }).run())}
                    />
                    <EditorContent editor={enunciadoEditor} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest">Tipo de Item</label>
                    <div className="flex gap-2">
                      {['Multipla Escolha', 'Certo/Errado'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            tipo: type as any,
                            alternativas: type === 'Certo/Errado' ? [
                              { id: '1', label: 'Certo', texto: 'Certo', is_correct: true },
                              { id: '2', label: 'Errado', texto: 'Errado', is_correct: false }
                            ] : []
                          })}
                          className={`px-4 py-1.5 rounded-lg text-[8px] font-black transition-all ${formData.tipo === type ? 'bg-[hsl(var(--accent))] text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'}`}
                        >
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[8px] font-black uppercase text-[hsl(var(--accent))] tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 size={10} /> Configuração de Gabarito
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSmartPaste(!showSmartPaste)}
                        className={`text-[7px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${showSmartPaste ? 'bg-[hsl(var(--accent))] text-black border-[hsl(var(--accent))]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                      >
                        <Zap size={10} /> {showSmartPaste ? 'Fechar Scanner' : 'Smart Paste'}
                      </button>
                    </div>

                    {showSmartPaste && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 space-y-2 animate-in zoom-in-95 duration-300">
                        <textarea
                          placeholder="Cole as alternativas do site aqui..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-[9px] font-bold text-slate-200 min-h-[120px] focus:border-purple-500/50 transition-all outline-none"
                          value={smartPasteText}
                          onChange={(e) => handleSmartPaste(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {(formData.alternativas || []).map((alt, i) => (
                        <div key={alt.id} className="flex gap-2 items-center group/alt">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, alternativas: (formData.alternativas || []).map(a => ({ ...a, is_correct: a.id === alt.id })), gabarito_oficial: String.fromCharCode(65 + i) })}
                            className={`w-8 h-8 rounded-lg font-black text-[10px] flex items-center justify-center transition-all shadow-lg shrink-0 border ${alt.is_correct
                              ? 'bg-green-500 border-green-400 text-black scale-105 shadow-green-500/20'
                              : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'
                              }`}
                          >
                            {alt.is_correct ? <CheckCircle2 size={14} /> : (formData.tipo === 'Multipla Escolha' ? String.fromCharCode(65 + i) : alt.label[0])}
                          </button>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder={`Texto da opção ${String.fromCharCode(65 + i)}...`}
                              className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-[10px] font-bold transition-all pr-10 ${alt.is_correct
                                ? 'border-green-500/30 text-green-400 bg-green-500/5'
                                : 'border-white/10 focus:border-[hsl(var(--accent)/0.5)] text-slate-300'
                                }`}
                              value={alt.texto}
                              onChange={e => {
                                const newAlts = [...(formData.alternativas || [])];
                                newAlts[i].texto = e.target.value;
                                setFormData({ ...formData, alternativas: newAlts });
                              }}
                            />
                            {formData.tipo === 'Multipla Escolha' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newAlts = (formData.alternativas || []).filter(a => a.id !== alt.id);
                                  setFormData({ ...formData, alternativas: newAlts });
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-red-400 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {formData.tipo === 'Multipla Escolha' && (formData.alternativas || []).length < 5 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, alternativas: [...(formData.alternativas || []), { id: Date.now().toString(), texto: '', label: '', is_correct: false }] })}
                          className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[7px] font-black text-slate-500 hover:text-[hsl(var(--accent))] hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 tracking-widest uppercase"
                        >
                          <Plus size={10} /> Adicionar Opção
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest flex items-center gap-1.5">
                      Gabarito Comentado <span className="text-[6px] opacity-30 uppercase font-bold">(Opcional)</span>
                    </label>
                    <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.3)] transition-all shadow-inner">
                      <EditorToolbar
                        editor={respostaEditor}
                        onImageUpload={(file) => handleImageUpload(file).then(url => url && respostaEditor?.chain().focus().setImage({ src: url }).run())}
                      />
                      <EditorContent editor={respostaEditor} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 text-[8px] font-black uppercase text-slate-500 hover:text-white transition-all tracking-widest"
                    >
                      Descartar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-black font-black uppercase text-[8px] shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all tracking-widest"
                    >
                      {isEditing ? 'Salvar Alterações' : 'Concluir Registro'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionsBank;
