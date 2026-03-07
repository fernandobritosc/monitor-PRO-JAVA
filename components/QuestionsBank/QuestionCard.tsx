import React, { useState, useEffect, useRef } from 'react';
import { GlobalQuestion } from '../../types';
import { Hash, BarChart2, CheckCircle2, X, RotateCcw, FileText, Brain, Sparkles, Music, MapIcon, Table, Headphones, Send, Edit, Trash2 } from 'lucide-react';
import { AIContentBox } from '../shared/AIContentBox';
import { QuestionAnalytics } from './QuestionAnalytics';
import { extractTecId, formatTextWithLinks } from './utils';

type AIProviderName = 'gemini' | 'groq';

interface QuestionCardProps {
  q: GlobalQuestion;
  isExpanded: boolean;
  isAdmin: boolean;
  onToggle: (id: string) => void;
  onEdit: (q: GlobalQuestion) => void;
  onDelete: (id: string) => void;
  onSolve: (q: GlobalQuestion, selectedAltId: string | null, tempo?: number) => void;
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

export const QuestionCard: React.FC<QuestionCardProps> = ({
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

  useEffect(() => {
    if (isExpanded) startTimeRef.current = Date.now();
  }, [isExpanded]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAlt) return;
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setIsFlipped(true);
    onSolve(q, selectedAlt, elapsed);
    if (showStats) setTimeout(() => setAnalyticsKey(k => k + 1), 800);
  };

  return (
    <div className={`glass-premium rounded-lg overflow-hidden border transition-all duration-300 group ${isExpanded ? 'border-[hsl(var(--accent)/0.3)] shadow-lg' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.1)]'}`}>
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
