import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFlashcards } from '../hooks/useFlashcards';
import {
  Zap, Plus, Trash2, Layers, Brain, CheckCircle2, RotateCcw,
  Loader2, Filter, BookOpen, Edit2, Save, X, DownloadCloud,
  Globe, Database, Copy, ChevronDown, Eye, Sparkles, AlertTriangle, Volume2, Info, Lock, ChevronLeft, ChevronRight, Trophy, Target, Tag, Send, MessageSquarePlus, ChevronUp, Headphones, Square, Mic2, FileAudio, RefreshCw, User, Music, FileText, Share2, ArrowRightLeft, Table, Map as MapIcon
} from 'lucide-react';
import { EditalMateria, Flashcard } from '../types';

// NOVO: Componente para renderizar Markdown simples
const MarkdownRenderer: React.FC<{ content: string; visualMode?: boolean }> = ({ content, visualMode = false }) => {
  const parts = useMemo(() => {
    if (!content) return [];

    const tableRegex = /(\|.*\|(?:\r?\n\|.*\|)+)/g;
    const splitByTables = content.split(tableRegex);

    return splitByTables.map((part, index) => {
      if (part.match(tableRegex)) {
        const rows = part.trim().split('\n');
        const header = rows[0].split('|').slice(1, -1).map(h => h.trim());
        const body = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

        return (
          <div key={index} className={`overflow-x-auto my-6 ${visualMode ? 'bg-white/5 border-2 border-cyan-500/20 shadow-lg' : 'bg-slate-950/30'} rounded-2xl border border-slate-700`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  {header.map((h, i) => <th key={i} className="p-4 text-[10px] font-black uppercase text-cyan-400 tracking-widest">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {body.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/10 transition-colors">
                    {row.map((cell, j) => <td key={j} className="p-4 text-xs text-slate-200 font-medium">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } else {
        return part.split('\n').map((line, lineIndex) => {
          const trimmedLine = line.trim();

          if (trimmedLine.startsWith('➡️') || trimmedLine.includes('➡️')) {
            return (
              <div key={`${index}-${lineIndex}`} className="flex items-center gap-4 my-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl animate-in slide-in-from-left-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <ArrowRightLeft size={16} />
                </div>
                <div className="text-sm font-bold text-slate-200">{line.replace(/➡️/g, '').trim()}</div>
              </div>
            );
          }

          if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            return (
              <div key={`${index}-${lineIndex}`} className="flex items-start gap-3 my-2 group">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:scale-125 transition-transform" />
                <span className="text-sm text-slate-300 leading-relaxed">{line.replace(/[-*]\s/, '')}</span>
              </div>
            );
          }

          if (trimmedLine.match(/^#{1,4}\s/)) {
            const level = (trimmedLine.match(/^#+/)?.[0].length || 1) as 1 | 2 | 3 | 4;
            const text = trimmedLine.replace(/^#+\s/, '');
            const sizes = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base' };
            return <h4 key={`${index}-${lineIndex}`} className={`${sizes[level]} font-black uppercase tracking-tighter mt-8 mb-4 text-cyan-400 border-l-4 border-cyan-500/30 pl-5`}>{text}</h4>;
          }

          if (!trimmedLine) return <div key={`${index}-${lineIndex}`} className="h-2" />;

          return <p key={`${index}-${lineIndex}`} className="my-2 text-sm text-slate-300 whitespace-pre-wrap leading-loose font-medium">{line}</p>;
        });
      }
    });
  }, [content, visualMode]);

  return <div className={`space-y-1 ${visualMode ? 'animate-in fade-in duration-1000' : ''}`}>{parts}</div>;
};

// NOVO: Componente unificado para caixas de conteúdo da IA
const AIContentBox: React.FC<{
  title: string;
  icon: React.ReactNode;
  content: string;
  isLoading: boolean;
  isMarkdown?: boolean;
  children?: React.ReactNode;
  onRegenerate?: () => void;
  accentColor?: string;
  activeTool?: string;
  handleExportLabPDF?: () => void;
}> = ({ title, icon, content, isLoading, isMarkdown = false, children, onRegenerate, accentColor = "purple", activeTool = "explanation", handleExportLabPDF }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoading && !content && !children) return null;

  const colorMap = {
    purple: "text-purple-400 border-purple-500/30",
    cyan: "text-cyan-400 border-cyan-500/30",
    emerald: "text-emerald-400 border-emerald-500/30",
    orange: "text-orange-400 border-orange-500/30",
    blue: "text-blue-400 border-blue-500/30",
  };

  return (
    <div className={`mt-4 bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-[2rem] p-8 animate-in zoom-in-95 duration-500 shadow-inner`}>
      <div className="flex justify-between items-center mb-6">
        <div className={`flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] ${colorMap[accentColor as keyof typeof colorMap] || colorMap.purple}`}>
          <div className={`p-2 rounded-xl bg-white/5 border ${colorMap[accentColor as keyof typeof colorMap] || colorMap.purple}`}>
            {icon}
          </div>
          {title}
        </div>
        <div className="flex items-center gap-3">
          {onRegenerate && content && !isLoading && (
            <button onClick={onRegenerate} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-cyan-400 transition-all border border-white/5" title="Recalibrar IA">
              <RefreshCw size={16} />
            </button>
          )}
          {handleExportLabPDF && content && !isLoading && (
            <button onClick={handleExportLabPDF} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-emerald-400 transition-all border border-white/5" title="Exportar PDF">
              <DownloadCloud size={16} />
            </button>
          )}
          {content && (
            <button onClick={handleCopy} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5">
              {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-16 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-t-2 border-purple-500 animate-spin"></div>
            <Sparkles size={20} className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto text-purple-400 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Sincronizando Sinapses...</p>
        </div>
      ) : (
        <div className="leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar pr-4 pb-4 scroll-smooth">
          {isMarkdown ? (
            <MarkdownRenderer
              content={content}
              visualMode={activeTool !== 'explanation' && activeTool !== 'description'}
            />
          ) : (
            <div className="text-slate-300 whitespace-pre-wrap text-sm font-medium">{content}</div>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

interface CustomFilterDropdownProps {
  label: string; value: string; options: string[]; onChange: (val: string) => void;
  icon?: React.ReactNode; widthClass?: string; colorClass?: string; align?: 'left' | 'right';
}

const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = ({ label, value, options, onChange, icon, widthClass = "w-48", colorClass = "focus:ring-cyan-500", align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const displayValue = value === 'Todas' || value === 'Todos' ? label : value;
  return (
    <div className={`relative ${widthClass}`} ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 flex justify-between items-center transition-all hover:bg-slate-800/50 ${isOpen ? 'ring-2 ring-opacity-50 ' + colorClass : ''}`}><div className="flex items-center gap-2 truncate flex-1 min-w-0">{icon}<span className="truncate">{displayValue}</span></div><ChevronDown size={14} className={`ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
      {isOpen && (<div className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} max-h-[300px] overflow-y-auto bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl z-[9999] custom-scrollbar animate-in fade-in slide-in-from-top-2`} style={{ width: '300px', maxWidth: '90vw' }}><div onClick={() => { onChange(label.includes('Matéria') || label.includes('Assunto') ? 'Todos' : 'Todos'); setIsOpen(false); }} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Limpar Seleção</span></div>{options.map((opt, idx) => (<div key={idx} onClick={() => { onChange(opt); setIsOpen(false); }} className={`p-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors flex items-start gap-2 ${value === opt ? 'bg-cyan-500/10' : ''}`}><div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${value === opt ? 'bg-cyan-400' : 'bg-slate-700'}`} /><span className={`text-xs font-medium leading-relaxed flex-1 ${value === opt ? 'text-cyan-100' : 'text-slate-300'}`}>{opt}</span></div>))}</div>)}
    </div>
  );
};


const Flashcards: React.FC<{ missaoAtiva: string; editais: EditalMateria[] }> = ({ missaoAtiva, editais }) => {
  const {
    activeTab, setActiveTab, cards, loading, loadingCommunity, communityDecks,
    showSqlModal, setShowSqlModal, previewDeck, setPreviewDeck, importingState,
    selectedAI, setSelectedAI, studyQueue, currentCardIndex, setCurrentCardIndex,
    isFlipped, setIsFlipped, aiStreamText, followUpQuery, setFollowUpQuery,
    aiLoading, mnemonicText, mnemonicLoading, extraFormat, extraContent, extraLoading,
    filterMateria, setFilterMateria, filterAssunto, setFilterAssunto,
    filterStatus, setFilterStatus, filterPodcast, setFilterPodcast,
    sessionStats, showSessionSummary, editingId, newCard, setNewCard,
    saveMessage, duplicateWarningId, isSpeaking, geminiKeyAvailable,
    groqKeyAvailable, isGeneratingPdf, podcastCache, isSyncing, isPlayingNeural,
    stopNeural, isGeneratingPodcast, podcastStatus, activeAiTool, setActiveAiTool,
    materias, assuntoOptions, statusOptions, availableTopics, currentCard,
    SQL_FLASHCARDS_POLICY,
    loadFlashcards, loadCommunityDecks, importCards, handleImportDeck, handleImportTopic,
    handleImportSingle, generateAIExplanation, handleGenerateMnemonic,
    handleGenerateExtraFormat, handleEdit, cancelEdit, clearForm, saveOrUpdateCard,
    deleteCard, startStudySession, endSession, handleCardResult, handleSpeak,
    handlePlayNeural, handlePodcastDuo, handleSendFollowUp, filteredCards,
    previewTopics, generatePDF, syncPodcastCache, getActiveProviderName, handleExportLabPDF,
  } = useFlashcards({ missaoAtiva, editais });

  const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTopicsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/20">
              <Brain size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">Flashcards Neural</h1>
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" /> Otimização de retenção ativa via IA
              </p>
            </div>
          </div>

          <div className="flex p-1.5 bg-[hsl(var(--bg-user-block))] rounded-[1.5rem] border border-[hsl(var(--border))] shadow-xl">
            <button
              onClick={() => setActiveTab('study')}
              className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'study' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}
            >
              Sessão Estudo
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'manage' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}
            >
              Inventário
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'community' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}
            >
              Arsenal Global
            </button>
          </div>
        </div>

        {activeTab === 'study' && (
          <div className="glass-premium rounded-[2.5rem] p-10 shadow-10 border border-[hsl(var(--border))] overflow-visible">

            <div className="flex flex-col gap-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
                <h3 className="text-xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))] flex items-center gap-4">
                  <Brain className="text-[hsl(var(--accent))]" /> Protocolo de Estudo
                </h3>
                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                  <CustomFilterDropdown label="Matéria" value={filterMateria} options={materias} onChange={setFilterMateria} icon={<BookOpen size={16} />} widthClass="w-full sm:w-56" />
                  <CustomFilterDropdown label="Assunto" value={filterAssunto} options={assuntoOptions} onChange={setFilterAssunto} icon={<Tag size={16} />} widthClass="w-full sm:w-56" />
                  <CustomFilterDropdown label="Status" value={filterStatus} options={statusOptions} onChange={setFilterStatus} icon={<Filter size={16} />} widthClass="w-full sm:w-48" />

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <CustomFilterDropdown label="Podcast" value={filterPodcast} options={['Todos', 'Com Podcast', 'Sem Podcast']} onChange={setFilterPodcast} icon={<Mic2 size={16} />} widthClass="flex-1" />
                    <button onClick={syncPodcastCache} disabled={isSyncing} className="p-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl hover:bg-white/5 transition-colors text-[hsl(var(--text-muted))] hover:text-white active:scale-95" title="Sincronizar áudios">
                      <RefreshCw size={20} className={isSyncing ? "animate-spin text-[hsl(var(--accent))]" : ""} />
                    </button>
                  </div>

                  <button onClick={startStudySession} className="w-full lg:w-auto px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-[hsl(var(--bg-main))] rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95">
                    <Zap size={18} /> Iniciar Protocolo
                  </button>
                </div>
              </div>

              {/* AI Selector & Stats */}
              <div className="glass-premium bg-[hsl(var(--accent)/0.03)] border border-[hsl(var(--accent)/0.1)] rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[hsl(var(--accent)/0.05)] blur-3xl rounded-full"></div>

                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--bg-user-block))] flex items-center justify-center text-[hsl(var(--accent))] shadow-lg border border-[hsl(var(--border))]">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-widest">Motor Cognitivo</h4>
                    <div className="text-[9px] font-black text-[hsl(var(--text-muted))] flex gap-3 mt-2 uppercase tracking-[0.2em]">
                      <span className={geminiKeyAvailable ? 'text-green-500' : ''}>Gemini: {geminiKeyAvailable ? 'ONLINE' : 'OFFLINE'}</span>
                      <span className="opacity-30">|</span>
                      <span className={groqKeyAvailable ? 'text-green-500' : ''}>Groq: {groqKeyAvailable ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex p-1.5 bg-[hsl(var(--bg-main))]/80 backdrop-blur-sm rounded-xl border border-[hsl(var(--border))] shadow-inner gap-1 overflow-hidden relative z-50">
                  <button
                    onClick={() => { console.log("AI: Auto"); setSelectedAI('auto'); }}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${selectedAI === 'auto' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg opacity-100' : 'text-[hsl(var(--text-muted))] hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => { console.log("AI: Gemini"); setSelectedAI('gemini'); }}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${selectedAI === 'gemini' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg opacity-100' : 'text-[hsl(var(--text-muted))] hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                  >
                    Gemini
                  </button>
                  <button
                    onClick={() => { console.log("AI: Groq"); setSelectedAI('groq'); }}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${selectedAI === 'groq' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg opacity-100' : 'text-[hsl(var(--text-muted))] hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                  >
                    Groq
                  </button>
                </div>
              </div>
            </div>

            {studyQueue.length === 0 ? (
              <div className="glass-premium rounded-[2rem] py-24 text-center border-dashed border-2 border-[hsl(var(--border))]">
                <div className="w-24 h-24 bg-[hsl(var(--bg-user-block))] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl border border-[hsl(var(--border))]">
                  <Brain size={48} className="text-[hsl(var(--text-muted))]" />
                </div>
                <h4 className="text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter">Motor de Estudo Inativo</h4>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-4 max-w-sm mx-auto leading-relaxed">
                  Configure os filtros acima e inicie o protocolo para carregar os cards neurais.
                </p>
                <p className="text-[9px] font-black text-[hsl(var(--accent))] uppercase tracking-[0.1em] mt-6">{filteredCards.length} cards mapeados em sua base</p>
              </div>
            ) : showSessionSummary ? (
              <div className="glass-premium rounded-[3rem] p-16 text-center animate-in zoom-in-95 border-2 border-[hsl(var(--border))] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500"></div>
                <div className="w-28 h-28 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(234,179,8,0.15)] border border-yellow-500/20">
                  <Trophy size={56} className="text-yellow-400 animate-bounce" />
                </div>
                <h2 className="text-4xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter mb-4">Meta Alcançada!</h2>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mb-12">Cognição otimizada. Confira o relatório da sessão.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-2xl mx-auto">
                  <div className="glass-premium bg-green-500/5 p-6 rounded-[1.5rem] border border-green-500/20">
                    <div className="text-4xl font-black text-green-400 tracking-tighter mb-2">{sessionStats.learned}</div>
                    <div className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Sólido</div>
                  </div>
                  <div className="glass-premium bg-yellow-500/5 p-6 rounded-[1.5rem] border border-yellow-500/20">
                    <div className="text-4xl font-black text-yellow-400 tracking-tighter mb-2">{sessionStats.review}</div>
                    <div className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Retorno</div>
                  </div>
                  <div className="glass-premium bg-blue-500/5 p-6 rounded-[1.5rem] border border-blue-500/20">
                    <div className="text-4xl font-black text-blue-400 tracking-tighter mb-2">{sessionStats.total}</div>
                    <div className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Analizados</div>
                  </div>
                </div>
                <button onClick={endSession} className="px-12 py-5 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] text-[hsl(var(--text-bright))] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-[hsl(var(--border))] shadow-xl active:scale-95">
                  Encerrar Sessão
                </button>
              </div>
            ) : (
              <div className="perspective-2000">
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="glass-premium bg-green-500/5 border border-green-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg">
                    <div className="text-lg font-black text-green-400">{sessionStats.learned}</div>
                    <div className="text-[8px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.15em]">Aprendidos</div>
                  </div>
                  <div className="glass-premium bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg">
                    <div className="text-lg font-black text-yellow-400">{sessionStats.review}</div>
                    <div className="text-[8px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.15em]">Revisar</div>
                  </div>
                  <div className="glass-premium bg-blue-500/5 border border-[hsl(var(--border))] p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg">
                    <div className="text-lg font-black text-blue-400">{currentCardIndex + 1}<span className="text-[hsl(var(--text-muted))] opacity-30">/</span>{studyQueue.length}</div>
                    <div className="text-[8px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.15em]">Progresso</div>
                  </div>
                </div>

                <div className={`relative w-full h-[550px] md:h-96 cursor-pointer transform-style-3d transition-all duration-700 ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => !isSpeaking && setIsFlipped(!isFlipped)}>
                  {/* Front Face */}
                  <div className={`absolute inset-0 backface-hidden glass-premium bg-gradient-to-br from-[hsl(var(--bg-card))] to-[hsl(var(--bg-main))] border-4 border-[hsl(var(--accent)/0.15)] rounded-[2.5rem] p-10 flex flex-col ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex justify-between items-start mb-10">
                      <div className="bg-[hsl(var(--bg-user-block))] px-5 py-2.5 rounded-full border border-[hsl(var(--border))] flex items-center gap-3 shadow-inner">
                        <BookOpen size={16} className="text-[hsl(var(--accent))]" />
                        <span className="text-xs font-bold text-[hsl(var(--text-bright))] uppercase tracking-widest truncate max-w-[250px]">
                          {currentCard.materia} {currentCard.assunto && <span className="text-[hsl(var(--text-muted))] mx-2">//</span>} {currentCard.assunto}
                        </span>
                      </div>
                      <button onClick={(e) => handleSpeak(currentCard.front, e)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] transition-all border border-[hsl(var(--border))] active:scale-95 shadow-lg">
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-6">
                      <p className="text-2xl md:text-4xl font-black text-[hsl(var(--text-bright))] text-center leading-[1.4] tracking-tight uppercase">
                        {currentCard.front}
                      </p>
                    </div>
                    <div className="mt-10 flex flex-col items-center gap-4">
                      {currentCard.author_name && (
                        <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest opacity-40">Autor: {currentCard.author_name}</span>
                      )}
                      <div className="flex items-center gap-3 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.25em] animate-pulse">
                        <ArrowRightLeft size={12} /> Clique para Inverter
                      </div>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className={`absolute inset-0 backface-hidden rotate-y-180 glass-premium bg-gradient-to-br from-[hsl(var(--accent)/0.1)] to-[hsl(var(--accent)/0.05)] border-4 border-[hsl(var(--accent)/0.3)] rounded-[2.5rem] p-10 flex flex-col ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex justify-between items-start mb-10">
                      <span className="bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[hsl(var(--accent)/0.2)]">Resposta Consolidada</span>
                      <button onClick={(e) => handleSpeak(currentCard.back, e)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] transition-all border border-[hsl(var(--border))] active:scale-95 shadow-lg">
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-6">
                      <p className="text-xl md:text-3xl font-bold text-[hsl(var(--text-bright))] text-center leading-relaxed">
                        {currentCard.back}
                      </p>
                    </div>
                    <div className="mt-10 flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.25em]">
                        <ArrowRightLeft size={12} /> Voltar para Pergunta
                      </div>
                    </div>
                  </div>
                </div>

                {/* Study Actions */}
                <div className="mt-10 flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-6">
                    <button onClick={() => handleCardResult('revisando')} className="group flex flex-col items-center justify-center gap-3 px-8 py-8 bg-[hsl(var(--bg-user-block))] hover:bg-yellow-500/10 text-yellow-400 border border-[hsl(var(--border))] hover:border-yellow-500/30 rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg">
                      <RotateCcw size={28} className="transition-transform group-hover:rotate-[-45deg]" />
                      <span className="text-[10px]">Retornar em Breve</span>
                    </button>
                    <button onClick={() => handleCardResult('aprendendo')} className="group flex flex-col items-center justify-center gap-3 px-8 py-8 bg-gradient-to-r from-green-600 to-emerald-500 text-[hsl(var(--bg-main))] rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-green-500/20">
                      <CheckCircle2 size={28} className="transition-transform group-hover:scale-110" />
                      <span className="text-[10px]">Conhecimento Retido</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <button onClick={() => { if (currentCardIndex > 0) { setCurrentCardIndex(currentCardIndex - 1); } }} disabled={currentCardIndex === 0} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] disabled:opacity-30 text-[hsl(var(--text-muted))] hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-[hsl(var(--border))] flex items-center justify-center gap-3 text-[10px] active:scale-95">
                      <ChevronLeft size={18} /> Anterior
                    </button>
                    <button onClick={() => { if (currentCardIndex < studyQueue.length - 1) { setCurrentCardIndex(currentCardIndex + 1); } }} disabled={currentCardIndex === studyQueue.length - 1} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] disabled:opacity-30 text-[hsl(var(--text-muted))] hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-[hsl(var(--border))] flex items-center justify-center gap-3 text-[10px] active:scale-95">
                      Próximo <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                {/* AI Tools */}
                <div className="mt-12 space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
                  {/* Neural Laboratory Redesign */}
                  <div className="mt-12 glass-premium border border-[hsl(var(--accent)/0.2)] rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-1000">
                    {/* Lab Header */}
                    <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 px-8 py-6 border-b border-white/10 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                          <Sparkles size={20} className={aiLoading || extraLoading || mnemonicLoading ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-widest">Neural Laboratory</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Motor Cognitivo: {getActiveProviderName()}</p>
                        </div>
                      </div>

                      {/* Podcast & Audio Controls */}
                      <div className="flex items-center gap-3">
                        {isGeneratingPodcast && (
                          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl animate-in zoom-in">
                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest">{podcastStatus || "Processando..."}</span>
                          </div>
                        )}

                        <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                          <button
                            onClick={handlePlayNeural}
                            disabled={!aiStreamText || isGeneratingPodcast}
                            className={`p-2.5 rounded-lg transition-all ${isPlayingNeural && !isGeneratingPodcast ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Ouvir Explicação (Solo)"
                          >
                            <Volume2 size={18} />
                          </button>
                          <button
                            onClick={handlePodcastDuo}
                            disabled={!aiStreamText || isGeneratingPodcast}
                            className={`p-2.5 rounded-lg transition-all ${isPlayingNeural && isGeneratingPodcast ? 'bg-pink-600 text-white animate-pulse' : 'text-slate-400 hover:text-pink-400'}`}
                            title="Podcast Duo (Alex & Bia)"
                          >
                            <Headphones size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lab Navigation */}
                    <div className="bg-slate-950/50 p-3 border-b border-white/5 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
                      {(['explanation', 'mnemonic', 'mapa', 'tabela', 'fluxo', 'info'] as const).map(tool => {
                        const toolConfig = {
                          explanation: { label: 'Análise', icon: Sparkles },
                          mnemonic: { label: 'Mnemônico', icon: Music },
                          mapa: { label: 'Mapa', icon: MapIcon },
                          tabela: { label: 'Tabela', icon: Table },
                          fluxo: { label: 'Fluxo', icon: ArrowRightLeft },
                          info: { label: 'Info', icon: FileText }
                        }[tool];

                        const hasContent = tool === 'explanation' ? !!aiStreamText :
                          tool === 'mnemonic' ? !!mnemonicText :
                            (extraFormat === tool && !!extraContent);

                        return (
                          <button
                            key={tool}
                            onClick={() => setActiveAiTool(tool)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeAiTool === tool ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/20 scale-105' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800'}`}
                          >
                            <toolConfig.icon size={14} />
                            {toolConfig.label}
                            {hasContent && <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse ml-1" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Lab Viewport */}
                    <div className="p-8 min-h-[300px] relative bg-slate-900/20">
                      {/* Tool Viewport Content */}
                      <div className="animate-in fade-in zoom-in-95 duration-300">
                        {activeAiTool === 'explanation' && (
                          <AIContentBox
                            title="Análise Neuro-Pedagógica"
                            icon={<Brain size={12} />}
                            content={aiStreamText}
                            isLoading={aiLoading}
                            isMarkdown={true}
                            activeTool={activeAiTool}
                            handleExportLabPDF={handleExportLabPDF}
                            onRegenerate={generateAIExplanation}
                          >
                            {!aiStreamText && !aiLoading && (
                              <div className="py-12 text-center">
                                <Sparkles size={40} className="mx-auto text-slate-700 mb-4" />
                                <p className="text-xs text-slate-400 mb-6 font-medium">O motor neural está pronto para expandir sua compreensão.</p>
                                <button onClick={generateAIExplanation} className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl shadow-indigo-600/20 active:scale-95 border border-white/20">Expandir Conhecimento</button>
                              </div>
                            )}
                          </AIContentBox>
                        )}

                        {activeAiTool === 'mnemonic' && (
                          <AIContentBox
                            title="Mnemônico Musical"
                            icon={<Music size={12} />}
                            content={mnemonicText}
                            isLoading={mnemonicLoading}
                            onRegenerate={handleGenerateMnemonic}
                            activeTool={activeAiTool}
                            handleExportLabPDF={handleExportLabPDF}
                          >
                            {!mnemonicText && !mnemonicLoading && (
                              <div className="py-12 text-center">
                                <Music size={40} className="mx-auto text-slate-700 mb-4" />
                                <p className="text-xs text-slate-400 mb-6 font-medium">Crie uma rima ou música curta para fixar este card.</p>
                                <button onClick={handleGenerateMnemonic} className="px-12 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl shadow-purple-600/20 active:scale-95 border border-white/20">Gerar Mnemônico</button>
                              </div>
                            )}
                          </AIContentBox>
                        )}

                        {(['mapa', 'tabela', 'fluxo', 'info'] as const).includes(activeAiTool as any) && (
                          <AIContentBox
                            title={{ mapa: 'Mapa Mental', tabela: 'Tabela Comparativa', fluxo: 'Fluxograma Lógico', info: 'Resumo Ilustrado' }[activeAiTool as 'mapa' | 'tabela' | 'fluxo' | 'info']}
                            icon={<Zap size={14} />}
                            accentColor={{ mapa: 'cyan', tabela: 'emerald', fluxo: 'orange', info: 'blue' }[activeAiTool as 'mapa' | 'tabela' | 'fluxo' | 'info']}
                            content={extraFormat === activeAiTool ? extraContent : ""}
                            isLoading={extraLoading && extraFormat === activeAiTool}
                            isMarkdown={true}
                            activeTool={activeAiTool}
                            handleExportLabPDF={handleExportLabPDF}
                            onRegenerate={() => handleGenerateExtraFormat(activeAiTool as any)}
                          >
                            {(!(extraFormat === activeAiTool && extraContent) && !(extraLoading && extraFormat === activeAiTool)) && (
                              <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                                  {activeAiTool === 'mapa' && <MapIcon size={32} className="text-cyan-400" />}
                                  {activeAiTool === 'tabela' && <Table size={32} className="text-emerald-400" />}
                                  {activeAiTool === 'fluxo' && <ArrowRightLeft size={32} className="text-orange-400" />}
                                  {activeAiTool === 'info' && <FileText size={32} className="text-blue-400" />}
                                </div>
                                <p className="text-xs text-slate-400 mb-6 font-medium max-w-xs mx-auto leading-relaxed">
                                  {{
                                    mapa: 'Estruturação de conceitos em ramos e tópicos para visão espacial do tema.',
                                    tabela: 'Organização de critérios comparativos para diferenciar temas polêmicos.',
                                    fluxo: 'Sequenciamento lógico de etapas ou processos para entender a ordem das coisas.',
                                    info: 'Síntese gráfica com pontos-chave destacados para revisão ultra-rápida.'
                                  }[activeAiTool as 'mapa' | 'tabela' | 'fluxo' | 'info']}
                                </p>
                                <button onClick={() => handleGenerateExtraFormat(activeAiTool as any)} className="px-12 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 border border-white/10">Ativar Ferramenta</button>
                              </div>
                            )}
                          </AIContentBox>
                        )}
                      </div>
                    </div>

                    {/* Chat Integration */}
                    <div className="p-8 border-t border-white/10 bg-black/20">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <MessageSquarePlus size={14} /> Dúvida Adicional ou Comando de Voz
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-slate-700 shadow-inner"
                          placeholder="Ex: Pode dar mais um exemplo detalhado?"
                          value={followUpQuery}
                          onChange={(e) => setFollowUpQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendFollowUp()}
                        />
                        <button
                          onClick={handleSendFollowUp}
                          disabled={!followUpQuery.trim() || aiLoading}
                          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 rounded-2xl transition-all shadow-lg active:scale-95"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="glass-premium rounded-[2.5rem] p-10 shadow-2xl space-y-12 border border-[hsl(var(--border))] overflow-visible">

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))] flex items-center gap-4">
                  <Layers className="text-[hsl(var(--accent))]" /> Inventário Neural
                </h3>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-2">Gestão completa de sua base de conhecimento</p>
              </div>

              <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                <CustomFilterDropdown label="Matéria" value={filterMateria} options={materias} onChange={setFilterMateria} icon={<BookOpen size={16} />} widthClass="w-full sm:w-56" />
                <CustomFilterDropdown label="Assunto" value={filterAssunto} options={assuntoOptions} onChange={setFilterAssunto} icon={<Tag size={16} />} widthClass="w-full sm:w-56" />

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <CustomFilterDropdown label="Podcast" value={filterPodcast} options={['Todos', 'Com Podcast', 'Sem Podcast']} onChange={setFilterPodcast} icon={<Mic2 size={16} />} widthClass="flex-1" />
                  <button onClick={syncPodcastCache} disabled={isSyncing} className="p-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl hover:bg-white/5 transition-colors text-[hsl(var(--text-muted))] hover:text-white active:scale-95" title="Sincronizar áudios">
                    <RefreshCw size={20} className={isSyncing ? "animate-spin text-[hsl(var(--accent))]" : ""} />
                  </button>
                </div>

                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPdf || filteredCards.length === 0}
                  className="w-full sm:w-auto px-6 py-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))] hover:text-white hover:bg-white/5 flex items-center justify-center gap-3 transition-all disabled:opacity-30 active:scale-95"
                >
                  {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  <span>Exportar PDF ({filteredCards.length})</span>
                </button>
              </div>
            </div>

            {/* Create/Edit Form */}
            <div className="glass-premium bg-[hsl(var(--bg-user-block))/0.4] border border-[hsl(var(--border))] rounded-[2rem] p-10 shadow-inner relative">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                {editingId ? <Edit2 size={120} /> : <Plus size={120} />}
              </div>

              <div className="flex justify-between items-center mb-10 relative z-10">
                <h4 className="text-lg font-black text-[hsl(var(--text-bright))] uppercase tracking-widest flex items-center gap-4">
                  {editingId ? (
                    <><div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 border border-yellow-500/20"><Edit2 size={20} /></div> Calibrar Célula Neural</>
                  ) : (
                    <><div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-lg text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)]"><Plus size={20} /></div> Injetar Novo Conhecimento</>
                  )}
                </h4>
                {editingId && (
                  <button onClick={cancelEdit} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-white bg-red-500/10 px-5 py-2.5 rounded-xl border border-red-500/20 transition-all hover:bg-red-500 active:scale-95">
                    <X size={14} className="inline mr-2" /> Abortar Edição
                  </button>
                )}
              </div>

              {saveMessage && (
                <div className="mb-8 p-5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs font-black uppercase tracking-[0.15em] flex items-center gap-4 animate-in slide-in-from-top-4">
                  <CheckCircle2 size={20} /> {saveMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 relative z-30">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Matéria</label>
                  <div className="relative">
                    <select value={newCard.materia} onChange={(e) => setNewCard({ ...newCard, materia: e.target.value })} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 text-sm text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none appearance-none transition-all cursor-pointer">
                      <option value="">Selecione a disciplina...</option>
                      {materias.filter((m: string) => m !== 'Todas' && m !== 'Todos').map((m: string) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--text-muted))]" size={16} />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3" ref={dropdownRef}>
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex justify-between items-center">
                    Assunto Específico
                    {!editingId && newCard.assunto && <span className="text-[9px] text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5 animate-pulse"><Lock size={10} /> Parâmetro Fixado</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newCard.assunto}
                      onChange={(e) => setNewCard({ ...newCard, assunto: e.target.value })}
                      onClick={() => { if (availableTopics.length > 0) setShowTopicsDropdown(true); }}
                      className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 text-sm text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none transition-all placeholder-[hsl(var(--text-muted)/0.5)]"
                      placeholder="Ex: Teoria Geral do Estado, Atos de Improbidade..."
                    />
                    {availableTopics.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 text-[hsl(var(--text-muted))] hover:text-white rounded-lg transition-colors"
                      >
                        {showTopicsDropdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    )}
                    {showTopicsDropdown && availableTopics.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                        {availableTopics.map((t: string, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setNewCard((prev: typeof newCard) => ({ ...prev, assunto: t }));
                              setShowTopicsDropdown(false);
                            }}
                            className="px-6 py-4 text-xs font-bold text-[hsl(var(--text-muted))] hover:bg-white/5 hover:text-white cursor-pointer border-b border-[hsl(var(--border))] last:border-0 transition-colors flex items-center gap-3"
                          >
                            <div className="w-1.5 h-1.5 bg-[hsl(var(--accent)/0.5)] rounded-full"></div>
                            {t}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Símbolo de Pergunta (Frente)</label>
                  <input type="text" value={newCard.front} onChange={(e) => setNewCard({ ...newCard, front: e.target.value })} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-5 text-base text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner" placeholder="Qual o conceito fundamental de...?" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Arquitetura de Resposta (Verso)</label>
                  <textarea value={newCard.back} onChange={(e) => setNewCard({ ...newCard, back: e.target.value })} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-5 text-base text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none min-h-[160px] transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner resize-none" placeholder="A resposta detalhada ou conceito chave..." />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 mt-12 relative z-10">
                <button onClick={saveOrUpdateCard} className={`flex-1 px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 text-white transition-all shadow-xl active:scale-95 ${editingId ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/20' : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:to-indigo-500 shadow-cyan-500/20'}`}>
                  {editingId ? <RotateCcw size={20} /> : <Save size={20} />}
                  {editingId ? 'Sincronizar Alterações' : 'Consolidar no Arsenal'}
                </button>
                {!editingId && (newCard.materia || newCard.assunto || newCard.front || newCard.back) && (
                  <button onClick={clearForm} className="px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 text-red-500 hover:text-white transition-all bg-red-500/5 hover:bg-red-500 border border-red-500/20 shadow-lg active:scale-95" title="Resetar todos os campos">
                    <RotateCcw size={20} /> Limpar Forçado
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-sm font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] flex items-center gap-4">
                Células Mapeadas <span className="w-12 h-px bg-[hsl(var(--border))]"></span> <span className="text-[10px] text-[hsl(var(--accent))]">{filteredCards.length} Unidades</span>
              </h4>

              {filteredCards.length === 0 ? (
                <div className="py-24 border-2 border-dashed border-[hsl(var(--border))] rounded-[2rem] text-center bg-[hsl(var(--bg-user-block))/0.2]">
                  <Layers size={48} className="mx-auto text-[hsl(var(--text-muted))] opacity-20 mb-6" />
                  <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum registro neural encontrado nos parâmetros atuais.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredCards.map((card: Flashcard) => (
                    <div key={card.id} id={`card-${card.id}`} className={`glass-premium bg-[hsl(var(--bg-card))] border-2 rounded-[2rem] p-8 transition-all group relative duration-500 overflow-hidden ${duplicateWarningId === card.id ? 'ring-4 ring-red-500 bg-red-500/10 animate-pulse z-10' : ''} ${editingId === card.id ? 'border-yellow-500 scale-[1.02]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.5)] hover:scale-[1.02]'}`}>
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-[hsl(var(--accent)/0.03)] rounded-full blur-2xl group-hover:bg-[hsl(var(--accent)/0.1)] transition-all"></div>

                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20 transition-all ${card.status === 'aprendido' ? 'bg-green-500/10 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
                            {card.status === 'aprendido' ? 'RETIDO' : 'REVISAR'}
                          </span>
                          {(podcastCache.has(card.original_audio_id || card.id)) && (
                            <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-2 animate-in zoom-in" title="Áudio neural disponível">
                              <Mic2 size={12} /> PODCAST
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(card)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--text-muted))] hover:text-yellow-400 hover:bg-yellow-400/10 border border-[hsl(var(--border))] transition-all active:scale-90">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deleteCard(card.id)} className="p-3 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl text-red-500 border border-red-500/20 transition-all active:scale-90">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8 relative z-10">
                        <h4 className="text-lg font-black text-[hsl(var(--text-bright))] leading-tight uppercase tracking-tight group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-2">{card.front}</h4>
                        <p className="text-xs text-[hsl(var(--text-muted))] leading-relaxed line-clamp-3 font-medium">{card.back}</p>
                      </div>

                      <div className="pt-6 border-t border-[hsl(var(--border))] flex flex-col gap-4 relative z-10">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-main))]">
                          <span className="flex items-center gap-2 max-w-[170px] truncate bg-[hsl(var(--bg-user-block))] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))]">
                            <BookOpen size={14} className="text-[hsl(var(--accent))]" /> {card.materia}
                          </span>
                          <span className="flex items-center gap-2 max-w-[140px] truncate bg-[hsl(var(--bg-user-block))] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))]">
                            <Tag size={14} className="text-purple-400" /> {card.assunto || 'GERAL'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[8px] font-black text-[hsl(var(--text-muted))/0.5] uppercase tracking-[0.2em]">
                          <div className="flex items-center gap-1.5 hover:text-[hsl(var(--text-muted))] transition-colors group/author">
                            <User size={10} className="group-hover/author:text-[hsl(var(--accent))]" /> {card.author_name || 'NEURAL CORE'}
                          </div>
                          <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => { navigator.clipboard.writeText(card.id); }}>
                            {card.id.substring(0, 8)} <Copy size={10} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="glass-premium rounded-[2.5rem] p-10 shadow-2xl space-y-12 border border-[hsl(var(--border))] overflow-visible">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))] flex items-center gap-4">
                  <Globe className="text-[hsl(var(--accent))]" /> Arsenal Global
                </h3>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-2">Expanda seu conhecimento com decks da comunidade</p>
              </div>
              <button onClick={() => setShowSqlModal(true)} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-yellow-500/20 flex items-center gap-3 transition-all hover:border-yellow-500/40 active:scale-95">
                <Database size={16} /> Configurar Permissões
              </button>
            </div>

            {loadingCommunity ? (
              <div className="text-center py-32">
                <div className="inline-flex p-5 rounded-full bg-[hsl(var(--accent)/0.05)] border border-[hsl(var(--accent)/0.1)] mb-6 animate-pulse">
                  <Loader2 className="animate-spin text-[hsl(var(--accent))]" size={40} />
                </div>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em]">Sincronizando com a nuvem neural...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {communityDecks.map((deck: any) => (
                  <div key={deck.materia} className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2rem] p-8 hover:border-[hsl(var(--accent)/0.5)] transition-all group relative duration-500 hover:shadow-2xl overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-[hsl(var(--accent)/0.05)] rounded-full blur-3xl group-hover:bg-[hsl(var(--accent)/0.15)] transition-all"></div>

                    <div className="relative z-10 mb-8">
                      <div className="w-14 h-14 bg-[hsl(var(--bg-user-block))] rounded-2xl flex items-center justify-center text-[hsl(var(--accent))] mb-6 border border-[hsl(var(--border))] group-hover:scale-110 transition-transform shadow-lg">
                        <BookOpen size={28} />
                      </div>
                      <h4 className="text-xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tight mb-2 group-hover:text-[hsl(var(--accent))] transition-colors">{deck.materia}</h4>
                      <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">{deck.count} Unidades de Conhecimento</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <button onClick={() => setPreviewDeck(deck)} className="bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] hover:text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-[hsl(var(--border))] shadow-lg active:scale-95">
                        <Eye size={16} /> Espiar
                      </button>
                      <button onClick={() => handleImportDeck(deck)} disabled={importingState.loading} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:to-indigo-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50">
                        {importingState.loading ? <Loader2 className="animate-spin" size={16} /> : <DownloadCloud size={16} />}
                        Clonar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSqlModal && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"><div className="bg-slate-950 border border-slate-700 w-full max-w-3xl rounded-2xl p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><button onClick={() => setShowSqlModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button><div className="flex items-center gap-3 mb-4 text-cyan-400"><Database size={32} /><h3 className="text-xl font-bold">Habilitar Compartilhamento</h3></div><p className="text-slate-300 text-sm mb-4">Execute este script no Supabase.</p><div className="relative bg-slate-900 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col"><div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-[11px] font-mono"><pre className="whitespace-pre-wrap">{SQL_FLASHCARDS_POLICY}</pre></div><div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end"><button onClick={() => { navigator.clipboard.writeText(SQL_FLASHCARDS_POLICY); alert("Copiado!"); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Copy size={14} /> Copiar SQL</button></div></div></div></div>)}

      {
        previewDeck && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-700 w-full max-w-5xl rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-bold text-white flex items-center gap-2"><Eye className="text-cyan-400" /> {previewDeck.materia}</h3><p className="text-slate-400 text-sm">{previewDeck.count} cards disponíveis para importação</p></div><button onClick={() => setPreviewDeck(null)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={20} /></button></div>
              {previewTopics.length > 0 && (<div className="mb-4 bg-slate-900/50 p-4 rounded-xl border border-white/5"><h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Tag size={12} /> Importar por Assunto (Tópico)</h4><div className="flex flex-wrap gap-2">{previewTopics.map((topic: string) => (<button key={topic} onClick={() => handleImportTopic(topic)} disabled={importingState.loading} className="bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 transition-all flex items-center gap-1.5"><DownloadCloud size={10} />{topic}</button>))}</div></div>)}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-xl border border-white/5 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{previewDeck.cards.map((card: any) => (<div key={card.id} className="bg-slate-900 border border-white/10 p-4 rounded-xl flex flex-col gap-3 group hover:border-cyan-500/30 transition-all relative"><div className="flex justify-between items-start"><span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded truncate max-w-[150px]">{card.assunto || 'Geral'}</span><button onClick={() => handleImportSingle(card)} disabled={importingState.loading} className="p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-white/5" title="Importar este card"><DownloadCloud size={14} /></button></div><div className="flex gap-2"><span className="text-xs font-bold text-cyan-500 min-w-[20px] mt-0.5">P:</span><p className="text-sm text-slate-200 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{card.front}</p></div><div className="h-px bg-white/5 w-full" /><div className="flex gap-2"><span className="text-xs font-bold text-purple-500 min-w-[20px] mt-0.5">R:</span><p className="text-xs text-slate-400 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{card.back}</p></div>{card.author_name && <div className="mt-auto pt-2 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><User size={10} /> Por: {card.author_name}</div>}</div>))}</div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10"><button onClick={() => setPreviewDeck(null)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">Cancelar</button><button onClick={handleImportDeck} disabled={importingState.loading} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">{importingState.loading ? <Loader2 className="animate-spin" size={18} /> : <DownloadCloud size={18} />}{importingState.loading ? 'Importando...' : 'Importar TUDO (Restantes)'}</button></div>
            </div>
          </div>
        )
      }
      <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div >
  );
};

export default Flashcards;