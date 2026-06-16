import React from 'react';
import { Edit2, Trash2, BookOpen, Tag, User, Copy, Mic2, Layers } from 'lucide-react';
import { Flashcard } from '../../../types';

interface FlashcardGridProps {
  filteredCards: Flashcard[];
  handleDeleteCard: (id: string) => void;
  handleEditCard: (card: Flashcard) => void;
  podcastCache: Set<string>;
  duplicateWarningId: string | null;
  editingId: string | null;
}

export const FlashcardGrid: React.FC<FlashcardGridProps> = ({
  filteredCards, handleDeleteCard, handleEditCard, podcastCache,
  duplicateWarningId, editingId,
}) => {
  if (filteredCards.length === 0) {
    return (
      <div className="py-24 border-2 border-dashed border-[hsl(var(--border))] rounded-[2rem] text-center bg-[hsl(var(--bg-user-block))/0.2]">
        <Layers size={48} className="mx-auto text-[hsl(var(--text-muted))] opacity-20 mb-6" />
        <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum registro neural encontrado nos parâmetros atuais.</p>
      </div>
    );
  }

  return (
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
              <button onClick={() => handleEditCard(card)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--text-muted))] hover:text-yellow-400 hover:bg-yellow-400/10 border border-[hsl(var(--border))] transition-all active:scale-90">
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleDeleteCard(card.id)} className="p-3 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl text-red-500 border border-red-500/20 transition-all active:scale-90">
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
  );
};
