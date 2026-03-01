import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { Question, EditalMateria, GlobalQuestion, QuestionAttempt } from '../types';
import { Search, Trash2, Edit, ExternalLink, AlertOctagon, CheckCircle2, X, ChevronDown, ChevronUp, FileText, Target, Zap, Layers, Clock, Plus, Brain, Volume2, Sparkles, Trophy, RotateCcw, ChevronLeft, ChevronRight, Save, Headphones, Music, Table, Map as MapIcon, Send, MessageSquarePlus } from 'lucide-react';
import { streamAIContent, AIProviderName, generateAIContent, handlePlayRevisionAudio, generatePodcastAudio, deleteCachedAudio } from '../services/aiService';
import { CustomSelector } from '../components/CustomSelector';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { AIContentBox } from '../components/shared/AIContentBox';
import { useStore } from '../hooks/useStore';

interface EditorToolbarProps {
  editor: Editor | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
      <button
        type="button"
        onClick={addImage}
        className="p-2 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400"
        title="Inserir Imagem"
      >
        <Zap size={16} />
      </button>
    </div>
  );
};

interface QuestionsBankProps {
  missaoAtiva: string;
  editais: EditalMateria[];
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

interface QuestionCardProps {
  q: GlobalQuestion;
  isExpanded: boolean;
  isAdmin: boolean;
  onToggle: (id: string) => void;
  onEdit: (q: GlobalQuestion) => void;
  onDelete: (id: string) => void;
  onSolve: (question: GlobalQuestion, selectedAltId: string | null) => void;
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
  isGeneratingPodcast: boolean;
  podcastStatus: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  q, isExpanded, isAdmin, onToggle, onEdit, onDelete, onSolve,
  selectedAI, setSelectedAI, aiStreamText, aiLoading, mnemonicText, mnemonicLoading,
  extraContent, extraLoading, activeAiTool, setActiveAiTool,
  onGenerateExplanation, onGenerateMnemonic, onGenerateExtra, onSendFollowUp,
  followUpQuery, setFollowUpQuery, isPlayingNeural, onPlayAudio, onPlayPodcast,
  isGeneratingPodcast, podcastStatus
}) => {
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAlt) return;
    setIsFlipped(true);
    onSolve(q, selectedAlt);
  };
  const statusInfo = {
    'Pendente': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', accent: 'bg-yellow-500' },
    'Revisado': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', accent: 'bg-blue-500' },
    'Dominado': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', accent: 'bg-green-500' },
  }[(q as any).status as 'Pendente' || 'Pendente'];

  return (
    <div className={`glass-premium rounded-2xl overflow-hidden border transition-all duration-500 group ${isExpanded ? `border-[hsl(var(--accent)/0.4)] shadow-2xl` : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.2)]'}`}>
      <div className="p-6 cursor-pointer" onClick={() => onToggle(q.id)}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-400/20 uppercase tracking-widest">{q.materia}</span>
            <span className="text-[8px] font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">{q.banca}</span>
            <span className="text-[8px] font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">{q.ano}</span>
            {q.tec_id && (() => {
              const tecInfo = extractTecId(q.tec_id);
              if (!tecInfo) return null;
              return (
                <a
                  href={tecInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="group/link flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-black transition-all cursor-pointer"
                >
                  <span className="text-[8px] font-black uppercase tracking-widest">TEC: {tecInfo.id}</span>
                </a>
              );
            })()}
          </div>
          <h4 className={`text-xl font-black uppercase tracking-tighter transition-colors duration-300 ${isExpanded ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-bright))] group-hover:text-[hsl(var(--accent))]'}`}>
            {q.assunto}
          </h4>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-black/5 border-t border-[hsl(var(--border))] p-6 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: isFlipped && q.resposta ? q.resposta : (q.enunciado || 'Enunciado não disponível') }} className="text-base font-bold tracking-tight text-[hsl(var(--text-bright))] leading-relaxed" />
          </div>

          <div className="space-y-4">
            {q.alternativas?.map((alt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedAlt === alt.id;

              let statusClasses = "border-white/5 hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/5";
              if (isFlipped) {
                if (alt.is_correct) statusClasses = "border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]";
                else if (isSelected) statusClasses = "border-red-500 bg-red-500/10 text-red-400";
                else statusClasses = "border-white/5 opacity-50";
              } else if (isSelected) {
                statusClasses = "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]";
              }

              return (
                <button
                  key={alt.id}
                  disabled={isFlipped}
                  onClick={(e) => { e.stopPropagation(); setSelectedAlt(alt.id); }}
                  className={`w-full flex gap-6 items-center p-6 rounded-2xl border text-left transition-all ${statusClasses}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${isSelected ? 'bg-[hsl(var(--accent))] text-black' : 'bg-white/10'}`}>
                    {letter}
                  </div>
                  <div className="flex-1 font-bold text-sm uppercase tracking-wide">{alt.texto}</div>
                  {isFlipped && alt.is_correct && <CheckCircle2 size={20} className="text-green-500" />}
                  {isFlipped && isSelected && !alt.is_correct && <X size={20} className="text-red-500" />}
                </button>
              );
            })}
          </div>

          {!isFlipped ? (
            <button
              onClick={handleConfirm}
              disabled={!selectedAlt}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-black font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-[0.98] disabled:opacity-20 transition-all"
            >
              Confirmar Resposta
            </button>
          ) : (
            <div className="flex gap-4 p-3 bg-white/5 rounded-2xl border border-white/10 items-center justify-center">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Resultado Processado</span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setSelectedAlt(null); }} className="text-[10px] font-black uppercase text-[hsl(var(--accent))] hover:underline flex items-center gap-2">
                <RotateCcw size={12} /> Tentar Novamente
              </button>
            </div>
          )}

          {q.anotacoes && (
            <div className="space-y-3">
              <h5 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={14} className="text-[hsl(var(--accent))]" /> Anotações Contextuais
              </h5>
              <div className="bg-[hsl(var(--bg-user-block))] p-6 rounded-2xl border border-[hsl(var(--border))] text-sm font-bold text-[hsl(var(--text-main))] leading-relaxed whitespace-pre-wrap">
                {formatTextWithLinks(q.anotacoes)}
              </div>
            </div>
          )}

          {/* LABORATÓRIO NEURAL (IA) - On Demand */}
          <div className="pt-6 border-t border-white/10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Brain size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Lab Neural</span>
              </div>

              <div className="flex flex-wrap gap-1 p-1 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm shadow-inner">
                {[
                  { id: 'explanation', icon: <Sparkles size={12} />, label: 'Análise', color: 'purple' },
                  { id: 'mnemonic', icon: <Music size={12} />, label: 'Mnemônico', color: 'orange' },
                  { id: 'mapa', icon: <MapIcon size={12} />, label: 'Mapa', color: 'emerald' },
                  { id: 'tabela', icon: <Table size={12} />, label: 'Tabela', color: 'cyan' }
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeAiTool === tool.id && (aiStreamText || mnemonicText || extraContent)) {
                        // Toggle OFF if already active and has content
                        setActiveAiTool(null as any);
                      } else {
                        setActiveAiTool(tool.id as any);
                        if (tool.id === 'explanation' && !aiStreamText) onGenerateExplanation(q);
                        if (tool.id === 'mnemonic' && !mnemonicText && !q.ai_generated_assets?.mnemonic) onGenerateMnemonic(q);
                        if (['mapa', 'tabela'].includes(tool.id) && !q.ai_generated_assets?.[tool.id as any]) onGenerateExtra(q, tool.id as any);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeAiTool === tool.id ? `bg-${tool.color}-600 text-white shadow-lg` : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {tool.icon} {tool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Display (Visible only when requested) */}
            {activeAiTool && (aiStreamText || mnemonicLoading || extraLoading || mnemonicText || extraContent || aiLoading) && (
              <div className="animate-in slide-in-from-bottom-2 duration-300 relative group/lab">
                <button
                  onClick={() => setActiveAiTool(null as any)}
                  className="absolute -top-3 -right-3 p-2 bg-slate-800 rounded-full border border-white/10 text-slate-400 hover:text-white z-10 opacity-0 group-hover/lab:opacity-100 transition-opacity shadow-lg"
                  title="Fechar Lab"
                >
                  <X size={12} />
                </button>

                {activeAiTool === 'explanation' && (
                  <AIContentBox
                    title="Análise Pro"
                    icon={<Sparkles size={14} />}
                    content={aiStreamText}
                    isLoading={aiLoading}
                    isMarkdown={true}
                    accentColor="purple"
                    activeTool="explanation"
                    onRegenerate={() => onGenerateExplanation(q)}
                  >
                    {aiStreamText && !aiLoading && (
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); onPlayAudio(q, aiStreamText); }}
                            disabled={isPlayingNeural}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${isPlayingNeural ? 'bg-slate-800 text-slate-500 border border-white/5' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
                          >
                            <Headphones size={14} /> {isPlayingNeural ? "Ouvindo..." : "Solo Audio"}
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); onPlayPodcast(q); }}
                            disabled={isGeneratingPodcast || isPlayingNeural}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 rounded-xl text-purple-400 font-bold text-[9px] uppercase tracking-widest transition-all border border-purple-500/20 shadow-xl"
                          >
                            <Headphones size={14} /> {isGeneratingPodcast ? podcastStatus : "Podcast Duo"}
                          </button>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative">
                          <input
                            type="text"
                            value={followUpQuery}
                            onChange={(e) => setFollowUpQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSendFollowUp(q)}
                            placeholder="Dúvida rápida..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-purple-500/30 transition-all pr-10"
                          />
                          <button
                            onClick={() => onSendFollowUp(q)}
                            disabled={!followUpQuery.trim() || aiLoading}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-purple-400 hover:text-purple-300 disabled:opacity-20 transition-all"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </AIContentBox>
                )}

                {activeAiTool === 'mnemonic' && (
                  <AIContentBox
                    title="Mnemônico"
                    icon={<Music size={14} />}
                    content={mnemonicText || q.ai_generated_assets?.mnemonic || ''}
                    isLoading={mnemonicLoading}
                    isMarkdown={true}
                    accentColor="orange"
                    activeTool="mnemonic"
                    onRegenerate={() => onGenerateMnemonic(q)}
                  />
                )}

                {(['mapa', 'tabela'] as const).includes(activeAiTool as any) && (
                  <AIContentBox
                    title={activeAiTool.toUpperCase()}
                    icon={activeAiTool === 'mapa' ? <MapIcon size={14} /> : <Table size={14} />}
                    content={extraContent || q.ai_generated_assets?.[activeAiTool as keyof typeof q.ai_generated_assets] || ''}
                    isLoading={extraLoading}
                    isMarkdown={true}
                    accentColor={activeAiTool === 'mapa' ? 'emerald' : 'cyan'}
                    activeTool={activeAiTool}
                    onRegenerate={() => onGenerateExtra(q, activeAiTool as any)}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-white/10">
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(q); }}
                    className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-cyan-400 hover:bg-white/10 transition-all border border-white/5"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(q.id); }}
                    className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-white/10 transition-all border border-white/5"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>

            {q.simulado && (
              <span className="text-[9px] font-black bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] px-4 py-2 rounded-full border border-[hsl(var(--accent)/0.2)] uppercase tracking-widest">
                {q.simulado}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva, editais }) => {
  const [questions, setQuestions] = useState<GlobalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeBankTab, setActiveBankTab] = useState<'gerador' | 'cadastro'>('gerador');

  // Filtros Avançados
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMateria, setFilterMateria] = useState<string>('Todas');
  const [filterAssunto, setFilterAssunto] = useState<string>('Todos');
  const [filterBanca, setFilterBanca] = useState<string>('Todas');
  const [filterAno, setFilterAno] = useState<string>('Todos');
  const [filterOrgao, setFilterOrgao] = useState<string>('Todos');
  const [filterCargo, setFilterCargo] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);

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
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState("");
  const [activeAiTool, setActiveAiTool] = useState<'explanation' | 'mnemonic' | 'mapa' | 'fluxo' | 'tabela' | 'info'>('explanation');
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [groqKeyAvailable, setGroqKeyAvailable] = useState(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setGeminiKeyAvailable(!!getGeminiKey());
    setGroqKeyAvailable(!!getGroqKey());
  }, []);

  // Tiptap Editors
  const enunciadoEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Placeholder.configure({ placeholder: 'Digite o enunciado...' })
    ],
    content: formData.enunciado,
    onUpdate: ({ editor }) => setFormData(prev => ({ ...prev, enunciado: editor.getHTML() })),
    editorProps: { attributes: { class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-6 text-[hsl(var(--text-bright))]' } },
  });

  const respostaEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Placeholder.configure({ placeholder: 'Digite o gabarito comentado...' })
    ],
    content: formData.resposta,
    onUpdate: ({ editor }) => setFormData(prev => ({ ...prev, resposta: editor.getHTML() })),
    editorProps: { attributes: { class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-6 text-[hsl(var(--text-bright))]' } },
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

  useEffect(() => { fetchQuestions(); }, [missaoAtiva]);

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

    return [...filtered].sort((a, b) => (Number(b.relevancia) || 0) - (Number(a.relevancia) || 0));
  }, [questions, searchTerm, filterMateria, filterAssunto, filterBanca, filterAno, filterOrgao, filterCargo]);

  const currentQuestion = viewMode === 'study' ? reviewQueue[currentQuestionIndex] : null;

  useEffect(() => {
    if (currentQuestion?.id !== lastQuestionIdRef.current) {
      setAiStreamText("");
      setAiLoading(false);
      setMnemonicText("");
      setMnemonicLoading(false);
      setExtraContent("");
      setExtraLoading(false);
      setExtraFormat(null);
      setFollowUpQuery("");
      setActiveAiTool('explanation');
      if (stopNeural) stopNeural();
      setIsPlayingNeural(false);
      lastQuestionIdRef.current = currentQuestion?.id || null;
    }
  }, [currentQuestion?.id]);

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
          onChunk: (chunk) => setAiStreamText(prev => prev + chunk),
          onComplete: () => {
            setAiLoading(false);
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
    setIsGeneratingPodcast(true);

    const stop = await generatePodcastAudio(
      aiStreamText || question.enunciado || '',
      question.id,
      getGeminiKey() || '',
      setPodcastStatus,
      () => {
        setIsGeneratingPodcast(false);
        setIsPlayingNeural(true);
      },
      () => setIsPlayingNeural(false),
      () => {
        setIsGeneratingPodcast(false);
        setIsPlayingNeural(false);
      }
    );
    setStopNeural(() => stop);
  };

  const getActiveProviderName = () => {
    if (selectedAI !== 'auto') return selectedAI.toUpperCase();
    const gemini = getGeminiKey();
    if (gemini && gemini.length > 10) return 'GEMINI 2.0';
    return 'GROQ';
  };

  const savedMaterias = useMemo(() => Array.from(new Set(questions.map(q => q.materia))).sort(), [questions]);
  const savedAssuntosGerais = useMemo(() => Array.from(new Set(questions.map(q => q.assunto))).sort(), [questions]);
  const savedBancas = useMemo(() => Array.from(new Set(questions.map(q => q.banca || '').filter(Boolean))).sort(), [questions]);
  const savedAnos = useMemo(() => Array.from(new Set(questions.map(q => q.ano || 0).filter(Boolean))).sort((a, b) => b - a), [questions]);
  const savedOrgaos = useMemo(() => Array.from(new Set(questions.map(q => q.orgao || '').filter(Boolean))).sort(), [questions]);
  const savedCargos = useMemo(() => Array.from(new Set(questions.map(q => q.cargo || '').filter(Boolean))).sort(), [questions]);

  const topicosSugeridos = useMemo(() => {
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === formData.materia);
    if (edital) return [...edital.topicos].sort();
    return Array.from(new Set(questions.filter(q => q.materia === formData.materia).map(q => q.assunto))).sort();
  }, [editais, missaoAtiva, formData.materia, questions]);

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

  const logAttempt = async (question: GlobalQuestion, selectedAltId: string | null) => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return;
    const isCorrect = question.alternativas?.find(a => a.id === selectedAltId)?.is_correct || false;
    await supabase.from('questao_tentativas').insert([{ user_id: user.id, question_id: question.id, selected_alt: selectedAltId || 'N/A', is_correct: isCorrect }]);
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
      {/* Condensado Header & Tabs Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-[hsl(var(--bg-main))]">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tighter leading-none">
              Lab Neural
            </h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60">
              Banco Inteligente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
          {['gerador', 'cadastro'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveBankTab(tab as any)}
              className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeBankTab === tab ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              {tab === 'gerador' ? 'Gerador' : 'Cadastro'}
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => { setIsEditing(null); setFormData(initialFormState); setShowForm(true); setActiveBankTab('cadastro'); }}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 font-bold uppercase tracking-widest text-[9px] flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Novo Registro
          </button>
        )}
      </div>

      {activeBankTab === 'gerador' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Barra de Busca & Filtros Compacta */}
          <div className="glass-premium p-4 rounded-2xl border border-[hsl(var(--border))] flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Pesquisar questões..."
                  className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold text-[hsl(var(--text-bright))] focus:border-cyan-500/50 outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 rounded-xl border flex items-center gap-2 transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <Layers size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-2 animate-in slide-in-from-top-2 duration-300">
                {[
                  { label: 'Matéria', val: filterMateria, set: setFilterMateria, list: savedMaterias },
                  { label: 'Assunto', val: filterAssunto, set: setFilterAssunto, list: savedAssuntosGerais },
                  { label: 'Banca', val: filterBanca, set: setFilterBanca, list: savedBancas },
                  { label: 'Orgão', val: filterOrgao, set: setFilterOrgao, list: savedOrgaos },
                  { label: 'Cargo', val: filterCargo, set: setFilterCargo, list: savedCargos },
                  { label: 'Ano', val: filterAno, set: setFilterAno, list: savedAnos }
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">{f.label}</label>
                    <input
                      type="text"
                      list={`list-${f.label}`}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-300"
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
          <div className="flex justify-between items-center mb-6 px-4">
            <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Brain size={14} className="text-[hsl(var(--accent))]" />
              {viewMode === 'study' ? `Estudo em Foco (${currentQuestionIndex + 1}/${reviewQueue.length})` : `Resultados (${reviewQueue.length})`}
            </h3>
            <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => {
                  setViewMode('study');
                  setCurrentQuestionIndex(0);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'study' ? 'bg-[hsl(var(--accent))] text-black' : 'text-slate-400 hover:text-white'}`}
              >
                <Brain size={12} /> Estudo
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-[hsl(var(--accent))] text-black' : 'text-slate-400 hover:text-white'}`}
              >
                <Layers size={12} /> Lista
              </button>
            </div>
          </div>

          {/* Listagem or Study Mode */}
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {loading ? <p className="text-center py-10">Carregando...</p> : reviewQueue.map(q => (
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
                  isGeneratingPodcast={isGeneratingPodcast}
                  podcastStatus={podcastStatus}
                />
              ))}
              {!loading && reviewQueue.length === 0 && (
                <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                  <AlertOctagon size={40} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Nenhuma questão encontrada</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {reviewQueue.length > 0 ? (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
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
                    isGeneratingPodcast={isGeneratingPodcast}
                    podcastStatus={podcastStatus}
                  />

                  {/* Navigation Controls Compacto */}
                  <div className="glass p-3 rounded-2xl border border-[hsl(var(--accent)/0.1)] flex justify-between items-center shadow-xl">
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      className="p-3 rounded-xl transition-all text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-10"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Página {currentQuestionIndex + 1} / {reviewQueue.length}
                      </span>
                    </div>

                    <button
                      disabled={currentQuestionIndex === reviewQueue.length - 1}
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--accent))] text-black rounded-xl font-black uppercase text-[9px] tracking-widest transition-all hover:scale-105"
                    >
                      Próxima <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                  <AlertOctagon size={40} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Filtre as questões para iniciar o estudo</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeBankTab === 'cadastro' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
          {(showForm || isEditing) ? (
            <div className="glass-premium p-10 rounded-[2.5rem] border border-[hsl(var(--accent)/0.3)] shadow-2xl relative">
              <button onClick={handleCancel} className="absolute top-8 right-8 p-2 bg-white/5 rounded-xl"><X size={20} /></button>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">{isEditing ? 'Editar Questão' : 'Novo Cadastro'}</h3>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white/5 p-6 rounded-3xl">
                  {[
                    { field: 'tec_id', label: 'Link/ID TEC', list: null },
                    { field: 'banca', label: 'Banca', list: savedBancas },
                    { field: 'orgao', label: 'Orgão', list: savedOrgaos },
                    { field: 'cargo', label: 'Cargo', list: savedCargos }
                  ].map(item => (
                    <div key={item.field} className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-500 ml-2">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        list={item.list ? `list-form-${item.field}` : undefined}
                        placeholder={item.field === 'tec_id' ? 'Cole o link da questão no TEC' : ''}
                        className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-xs font-bold"
                        value={(formData as any)[item.field]}
                        onChange={e => setFormData({ ...formData, [item.field]: e.target.value })}
                      />
                      {item.list && (
                        <datalist id={`list-form-${item.field}`}>
                          {item.list.map((val, i) => <option key={i} value={val.toString()} />)}
                        </datalist>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {['materia', 'assunto'].map(field => (
                    <div key={field} className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-500 ml-2">{field}</label>
                      <input
                        type="text"
                        list={`list-form-${field}`}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold"
                        value={(formData as any)[field]}
                        onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                      />
                      <datalist id={`list-form-${field}`}>
                        {(field === 'materia' ? savedMaterias : topicosSugeridos).map((item, i) => <option key={i} value={item} />)}
                      </datalist>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2 font-black flex items-center gap-2">
                    Enunciado <span className="text-[8px] opacity-50">(Suporta Imagens e Formatação)</span>
                  </label>
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.3)] transition-all">
                    <EditorToolbar editor={enunciadoEditor} />
                    <EditorContent editor={enunciadoEditor} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Tipo de Questão</label>
                    <div className="flex gap-4">
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
                          className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all ${formData.tipo === type ? 'bg-[hsl(var(--accent))] text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black uppercase text-[hsl(var(--accent))] tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={12} /> Selecione a Alternativa Correta
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSmartPaste(!showSmartPaste)}
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${showSmartPaste ? 'bg-[hsl(var(--accent))] text-black border-[hsl(var(--accent))]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                      >
                        <Zap size={14} /> {showSmartPaste ? 'Fechar Cola Inteligente' : 'Cola Inteligente'}
                      </button>
                    </div>

                    {showSmartPaste && (
                      <div className="bg-white/5 border border-[hsl(var(--accent)/0.3)] rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-slate-400">Cole aqui o bloco de alternativas (A, B, C...)</label>
                          <span className="text-[9px] text-slate-500 font-bold">Ex: A) lhe. B) na. ...</span>
                        </div>
                        <textarea
                          placeholder="Cole as alternativas aqui..."
                          className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-xs font-bold text-[hsl(var(--text-bright))] min-h-[150px] focus:border-[hsl(var(--accent)/0.5)] transition-all outline-none"
                          value={smartPasteText}
                          onChange={(e) => handleSmartPaste(e.target.value)}
                        />
                        <p className="text-[9px] text-slate-500 font-bold italic">O sistema identificará as letras automaticamente e preencherá os campos abaixo.</p>
                      </div>
                    )}

                    {(formData.alternativas || []).map((alt, i) => (
                      <div key={alt.id} className="flex gap-4 items-center group/alt">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, alternativas: (formData.alternativas || []).map(a => ({ ...a, is_correct: a.id === alt.id })), gabarito_oficial: String.fromCharCode(65 + i) })}
                          className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center transition-all shadow-lg shrink-0 ${alt.is_correct
                            ? 'bg-green-500 text-black scale-110 shadow-green-500/20 ring-4 ring-green-500/10'
                            : 'bg-white/5 text-slate-400 border border-white/5 hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/10'
                            }`}
                          title="Clique para marcar como correta"
                        >
                          {alt.is_correct ? <CheckCircle2 size={20} /> : (formData.tipo === 'Multipla Escolha' ? String.fromCharCode(65 + i) : alt.label[0])}
                        </button>
                        <div className="flex-1 relative group/input">
                          <input
                            type="text"
                            placeholder={`Texto da alternativa ${String.fromCharCode(65 + i)}...`}
                            className={`w-full bg-white/5 border rounded-2xl px-6 py-4 text-sm font-bold transition-all pr-12 ${alt.is_correct
                              ? 'border-green-500/50 text-green-400 bg-green-500/5'
                              : 'border-white/5 focus:border-[hsl(var(--accent)/0.3)]'
                              }`}
                            value={alt.texto}
                            onChange={e => {
                              const newAlts = [...(formData.alternativas || [])];
                              newAlts[i].texto = e.target.value;
                              setFormData({ ...formData, alternativas: newAlts });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newAlts = (formData.alternativas || []).filter(a => a.id !== alt.id);
                              setFormData({ ...formData, alternativas: newAlts });
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover/input:opacity-100 transition-all"
                            title="Remover alternativa"
                          >
                            <Trash2 size={14} />
                          </button>
                          {alt.is_correct && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-green-500 tracking-widest flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                              GABARITO <CheckCircle2 size={10} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {formData.tipo === 'Multipla Escolha' && (formData.alternativas || []).length < 5 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, alternativas: [...(formData.alternativas || []), { id: Date.now().toString(), texto: '', label: '', is_correct: false }] })}
                        className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[9px] font-black text-slate-500 hover:text-[hsl(var(--accent))] hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Adicionar Alternativa
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2 font-black flex items-center gap-2">
                    Gabarito Comentado <span className="text-[8px] opacity-50">(Suporta Imagens e Formatação)</span>
                  </label>
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.3)] transition-all">
                    <EditorToolbar editor={respostaEditor} />
                    <EditorContent editor={respostaEditor} />
                  </div>
                </div>

                <div className="flex justify-end gap-6 pt-8 border-t border-white/10">
                  <button type="button" onClick={handleCancel} className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Descartar</button>
                  <button type="submit" className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-black font-black uppercase text-[10px]">
                    {isEditing ? 'Salvar Edição' : 'Concluir Cadastro'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--accent)/0.1)] flex items-center justify-center text-[hsl(var(--accent))] mb-6"><Plus size={40} /></div>
              <h3 className="text-xl font-black uppercase mb-8">Novo Registro Estratégico</h3>
              <button
                onClick={() => setShowForm(true)}
                className="px-12 py-5 bg-[hsl(var(--accent))] text-black rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Abrir Formulário
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default QuestionsBank;
