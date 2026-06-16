import React from 'react';
import {
  Sparkles, Brain, Music, Map as MapIcon, Table, ArrowRightLeft, FileText,
  Volume2, Headphones, MessageSquarePlus, Send, Zap
} from 'lucide-react';
import { AIContentBox } from '../../shared/AIContentBox';

interface NeuralLabProps {
  currentCard: { front: string; back: string; materia: string; assunto?: string };
  aiStreamText: string;
  setAiStreamText: (val: string) => void;
  aiLoading: boolean;
  generateAIExplanation: () => void;
  mnemonicText: string;
  setMnemonicText: (val: string) => void;
  mnemonicLoading: boolean;
  handleGenerateMnemonic: () => void;
  extraFormat: string | null;
  setExtraFormat: (val: string) => void;
  extraContent: string;
  setExtraContent: (val: string) => void;
  extraLoading: boolean;
  followUpQuery: string;
  setFollowUpQuery: (val: string) => void;
  handleSendFollowUp: () => void;
  activeAiTool: string;
  setActiveAiTool: (tool: 'explanation' | 'mnemonic' | 'mapa' | 'tabela' | 'fluxo' | 'info') => void;
  handleGenerateExtraFormat: (tool: 'mapa' | 'tabela' | 'fluxo' | 'info') => void;
  showPodcastPanel: boolean;
  setShowPodcastPanel: (val: boolean) => void;
  handleGeneratePodcast: () => void;
  isGeneratingPodcast: boolean;
  podcastUrl: string;
  podcastDisplayTitle: string;
  syncPodcastCache: () => void;
  isPlayingNeural: boolean;
  handlePlayNeural: () => void;
  handlePodcastDuo: () => void;
  podcastStatus: string;
  isSpeaking: boolean;
  getActiveProviderName: () => string;
  handleExportLabPDF: () => void;
}

const tools = ['explanation', 'mnemonic', 'mapa', 'tabela', 'fluxo', 'info'] as const;

const toolConfig: Record<string, { label: string; icon: React.ElementType }> = {
  explanation: { label: 'Análise', icon: Sparkles },
  mnemonic: { label: 'Mnemônico', icon: Music },
  mapa: { label: 'Mapa', icon: MapIcon },
  tabela: { label: 'Tabela', icon: Table },
  fluxo: { label: 'Fluxo', icon: ArrowRightLeft },
  info: { label: 'Info', icon: FileText },
};

const extraToolLabels: Record<string, string> = {
  mapa: 'Mapa Mental',
  tabela: 'Tabela Comparativa',
  fluxo: 'Fluxograma Lógico',
  info: 'Resumo Ilustrado',
};

const extraToolAccents: Record<string, string> = {
  mapa: 'cyan',
  tabela: 'emerald',
  fluxo: 'orange',
  info: 'blue',
};

const extraToolIcons: Record<string, React.ReactNode> = {
  mapa: <MapIcon size={32} className="text-cyan-400" />,
  tabela: <Table size={32} className="text-emerald-400" />,
  fluxo: <ArrowRightLeft size={32} className="text-orange-400" />,
  info: <FileText size={32} className="text-blue-400" />,
};

const extraToolDescriptions: Record<string, string> = {
  mapa: 'Estruturação de conceitos em ramos e tópicos para visão espacial do tema.',
  tabela: 'Organização de critérios comparativos para diferenciar temas polêmicos.',
  fluxo: 'Sequenciamento lógico de etapas ou processos para entender a ordem das coisas.',
  info: 'Síntese gráfica com pontos-chave destacados para revisão ultra-rápida.',
};

export const NeuralLab: React.FC<NeuralLabProps> = ({
  aiStreamText, aiLoading, generateAIExplanation,
  mnemonicText, mnemonicLoading, handleGenerateMnemonic,
  extraFormat, extraContent, extraLoading,
  followUpQuery, setFollowUpQuery, handleSendFollowUp,
  activeAiTool, setActiveAiTool, handleGenerateExtraFormat,
  isGeneratingPodcast, handlePlayNeural, handlePodcastDuo,
  isPlayingNeural, podcastStatus, getActiveProviderName, handleExportLabPDF,
}) => {
  const hasContent = (tool: string) => {
    if (tool === 'explanation') return !!aiStreamText;
    if (tool === 'mnemonic') return !!mnemonicText;
    return extraFormat === tool && !!extraContent;
  };

  const renderToolContent = (tool: string) => {
    if (tool === 'explanation') {
      return (
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
      );
    }

    if (tool === 'mnemonic') {
      return (
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
      );
    }

    if (['mapa', 'tabela', 'fluxo', 'info'].includes(tool)) {
      return (
        <AIContentBox
          title={extraToolLabels[tool]}
          icon={<Zap size={14} />}
          accentColor={extraToolAccents[tool]}
          content={extraFormat === tool ? extraContent : ""}
          isLoading={extraLoading && extraFormat === tool}
          isMarkdown={true}
          activeTool={activeAiTool}
          handleExportLabPDF={handleExportLabPDF}
          onRegenerate={() => handleGenerateExtraFormat(tool as 'mapa' | 'tabela' | 'fluxo' | 'info')}
        >
          {(!(extraFormat === tool && extraContent) && !(extraLoading && extraFormat === tool)) && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                {extraToolIcons[tool]}
              </div>
              <p className="text-xs text-slate-400 mb-6 font-medium max-w-xs mx-auto leading-relaxed">
                {extraToolDescriptions[tool]}
              </p>
              <button onClick={() => handleGenerateExtraFormat(tool as 'mapa' | 'tabela' | 'fluxo' | 'info')} className="px-12 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 border border-white/10">Ativar Ferramenta</button>
            </div>
          )}
        </AIContentBox>
      );
    }

    return null;
  };

  return (
    <div className="mt-12 space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
      <div className="mt-12 glass-premium border border-[hsl(var(--accent)/0.2)] rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-1000">
        {/* Lab Header */}
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 px-4 md:px-8 py-4 md:py-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
          <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3">
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
          {tools.map(tool => {
            const config = toolConfig[tool];
            return (
              <button
                key={tool}
                onClick={() => setActiveAiTool(tool)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeAiTool === tool ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/20 scale-105' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800'}`}
              >
                <config.icon size={14} />
                {config.label}
                {hasContent(tool) && <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Lab Viewport */}
        <div className="p-4 md:p-8 min-h-[300px] relative bg-slate-900/20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            {renderToolContent(activeAiTool)}
          </div>
        </div>

        {/* Chat Integration */}
        <div className="p-4 md:p-8 border-t border-white/10 bg-black/20">
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
  );
};
