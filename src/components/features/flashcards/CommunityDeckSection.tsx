import React from 'react';
import {
  Globe, Database, BookOpen, Eye, DownloadCloud, Loader2, Sparkles,
  Tag, X, User
} from 'lucide-react';
import { CommunityDeck, Flashcard } from '../../../types';

interface ImportingState {
  loading: boolean;
  text: string;
}

interface CommunityDeckSectionProps {
  communityDecks: CommunityDeck[];
  importDeck: (deck: CommunityDeck) => void;
  loadingCommunity: boolean;
  previewDeck: CommunityDeck | null;
  setPreviewDeck: (deck: CommunityDeck | null) => void;
  setShowSqlModal: (val: boolean) => void;
  importingState: ImportingState;
  handleImportTopic?: (topic: string) => void;
  handleImportSingle?: (card: Flashcard) => void;
  previewTopics?: string[];
}

export const CommunityDeckSection: React.FC<CommunityDeckSectionProps> = ({
  communityDecks, importDeck, loadingCommunity, previewDeck, setPreviewDeck,
  setShowSqlModal, importingState, handleImportTopic, handleImportSingle, previewTopics = [],
}) => {
  return (
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
          {communityDecks.map((deck: CommunityDeck) => (
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
                <button onClick={() => importDeck(deck)} disabled={importingState.loading} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:to-indigo-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50">
                  {importingState.loading ? <Loader2 className="animate-spin" size={16} /> : <DownloadCloud size={16} />}
                  Clonar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDeck && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 w-full max-w-5xl rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-cyan-400" /> {previewDeck.materia}</h3>
                <p className="text-slate-400 text-sm">{previewDeck.count} cards disponíveis para importação</p>
              </div>
              <button onClick={() => setPreviewDeck(null)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            {previewTopics.length > 0 && (
              <div className="mb-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Tag size={12} /> Importar por Assunto (Tópico)</h4>
                <div className="flex flex-wrap gap-2">
                  {previewTopics.map((topic) => (
                    <button key={topic} onClick={() => handleImportTopic?.(topic)} disabled={importingState.loading} className="bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 transition-all flex items-center gap-1.5">
                      <DownloadCloud size={10} />{topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-xl border border-white/5 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewDeck.cards.map((card) => (
                <div key={card.id} className="bg-slate-900 border border-white/10 p-4 rounded-xl flex flex-col gap-3 group hover:border-cyan-500/30 transition-all relative">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded truncate max-w-[150px]">{card.assunto || 'Geral'}</span>
                    <button onClick={() => handleImportSingle?.(card)} disabled={importingState.loading} className="p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-white/5" title="Importar este card">
                      <DownloadCloud size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-cyan-500 min-w-[20px] mt-0.5">P:</span>
                    <p className="text-sm text-slate-200 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{card.front}</p>
                  </div>
                  <div className="h-px bg-white/5 w-full" />
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-purple-500 min-w-[20px] mt-0.5">R:</span>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{card.back}</p>
                  </div>
                  {card.author_name && <div className="mt-auto pt-2 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><User size={10} /> Por: {card.author_name}</div>}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setPreviewDeck(null)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={() => importDeck(previewDeck)} disabled={importingState.loading} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                {importingState.loading ? <Loader2 className="animate-spin" size={18} /> : <DownloadCloud size={18} />}
                {importingState.loading ? 'Importando...' : 'Importar TUDO (Restantes)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
