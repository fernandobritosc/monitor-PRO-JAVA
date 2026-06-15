import React, { useState, useMemo } from 'react';
import {
  X, RotateCcw, Database, ChevronLeft, BookOpen, Tag, Loader2, Zap
} from 'lucide-react';
import { Flashcard } from '../../../types';
import { CustomFilterDropdown } from '../../shared/CustomFilterDropdown';

interface MissionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherMissionsWithCards: () => Promise<string[]>;
  fetchCardsFromMission: (missionName: string) => Promise<Flashcard[]>;
  importingState: { loading: boolean };
  importCards: (cards: Flashcard[], type: "deck" | "topic" | "single") => Promise<void>;
}

const MissionImportModal: React.FC<MissionImportModalProps> = ({
  isOpen, onClose, otherMissionsWithCards,
  fetchCardsFromMission, importingState, importCards
}) => {
  const [showModal, setShowModal] = useState(false);
  const [availableMissions, setAvailableMissions] = useState<string[]>([]);
  const [selectedSourceMission, setSelectedSourceMission] = useState('');
  const [missionCards, setMissionCards] = useState<Flashcard[]>([]);
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionFilterMateria, setMissionFilterMateria] = useState('Todas');
  const [missionFilterAssunto, setMissionFilterAssunto] = useState('Todos');

  const sourceMissionMaterias = useMemo(() => {
    const list = new Set<string>();
    missionCards.forEach(c => list.add(c.materia));
    return ['Todas', ...Array.from(list).sort()];
  }, [missionCards]);

  const sourceMissionAssuntos = useMemo(() => {
    const list = new Set<string>();
    const source = missionFilterMateria === 'Todas' ? missionCards : missionCards.filter(c => c.materia === missionFilterMateria);
    source.forEach(c => { if (c.assunto) list.add(c.assunto); });
    return ['Todos', ...Array.from(list).sort()];
  }, [missionCards, missionFilterMateria]);

  const filteredMissionCards = useMemo(() => {
    return missionCards.filter(card => {
      const matchMateria = missionFilterMateria === 'Todas' || card.materia === missionFilterMateria;
      const matchAssunto = missionFilterAssunto === 'Todos' || card.assunto === missionFilterAssunto;
      return matchMateria && matchAssunto;
    });
  }, [missionCards, missionFilterMateria, missionFilterAssunto]);

  const openModal = async () => {
    setShowModal(true);
    const missions = await otherMissionsWithCards();
    setAvailableMissions(missions);
  };

  const handleSelectMission = async (missionName: string) => {
    setSelectedSourceMission(missionName);
    setMissionLoading(true);
    try {
      const cardsFetched = await fetchCardsFromMission(missionName);
      setMissionCards(cardsFetched);
    } finally {
      setMissionLoading(false);
    }
  };

  const handleImportFromMission = () => {
    if (filteredMissionCards.length === 0) return;
    importCards(filteredMissionCards, 'deck');
    handleClose();
  };

  const handleClose = () => {
    setShowModal(false);
    onClose();
    setSelectedSourceMission('');
    setMissionCards([]);
    setMissionFilterMateria('Todas');
    setMissionFilterAssunto('Todos');
    setAvailableMissions([]);
  };

  if (!isOpen) return null;
  if (!showModal) {
    openModal();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
      <div className="glass-premium bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] w-full max-w-4xl rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-[hsl(var(--border))] pb-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[hsl(var(--text-bright))] flex items-center gap-3">
              <RotateCcw className="text-[hsl(var(--accent))]" /> Reciclar Flashcards de Outra Missão
            </h3>
            <p className="text-[hsl(var(--text-muted))] text-[10px] font-bold uppercase tracking-widest mt-1">Copie seu material de concursos anteriores para a missão atual</p>
          </div>
          <button onClick={handleClose} className="p-2 bg-[hsl(var(--bg-user-block))] rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] border border-[hsl(var(--border))] transition-all">
            <X size={20} />
          </button>
        </div>

        {!selectedSourceMission ? (
          <div className="space-y-6">
            <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest block ml-1">Selecione a Missão de Origem</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableMissions.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-[hsl(var(--bg-user-block))] rounded-2xl border border-dashed border-[hsl(var(--border))] text-[hsl(var(--text-muted))] uppercase font-black text-[10px] tracking-widest">
                  Nenhuma missão encontrada com flashcards
                </div>
              ) : (
                availableMissions.map((mission) => (
                  <button
                    key={mission}
                    onClick={() => handleSelectMission(mission)}
                    className="p-6 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.5)] rounded-2xl text-left transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Database size={16} className="text-[hsl(var(--accent))] group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-[hsl(var(--text-bright))] uppercase tracking-tight">{mission}</span>
                    </div>
                    <p className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Clique para espiar os cards</p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-2">
              <button onClick={() => setSelectedSourceMission('')} className="flex items-center gap-2 text-[9px] font-black text-[hsl(var(--accent))] uppercase tracking-widest hover:text-white transition-colors">
                <ChevronLeft size={14} /> Voltar para lista de missões
              </button>
              <span className="text-[10px] font-bold text-[hsl(var(--text-bright))] uppercase tracking-widest">
                Fonte: <span className="text-[hsl(var(--accent))]">{selectedSourceMission}</span> ({missionCards.length} cards)
              </span>
            </div>

            {missionLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 size={40} className="text-[hsl(var(--accent))] animate-spin mb-4" />
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Escaneando base neural...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-4 mb-6 px-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-2 block ml-1">Matéria na Origem</label>
                    <CustomFilterDropdown
                      label="Matéria"
                      value={missionFilterMateria}
                      options={sourceMissionMaterias}
                      onChange={(val) => { setMissionFilterMateria(val); setMissionFilterAssunto('Todos'); }}
                      icon={<BookOpen size={14} />}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-2 block ml-1">Assunto na Origem</label>
                    <CustomFilterDropdown
                      label="Assunto"
                      value={missionFilterAssunto}
                      options={sourceMissionAssuntos}
                      onChange={setMissionFilterAssunto}
                      icon={<Tag size={14} />}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[hsl(var(--bg-main))] rounded-xl border border-[hsl(var(--border))] p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMissionCards.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-[hsl(var(--text-muted))] uppercase font-black text-[10px] tracking-widest">
                      Nenhum card corresponde aos filtros
                    </div>
                  ) : (
                    filteredMissionCards.map((card) => (
                      <div key={card.id} className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] p-6 rounded-2xl shadow-inner group transition-all hover:border-[hsl(var(--accent)/0.3)]">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-full text-[8px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">
                            {card.materia}
                          </span>
                          {card.assunto && (
                            <span className="text-[8px] font-bold text-[hsl(var(--accent))] uppercase tracking-widest truncate max-w-[150px]">
                              {card.assunto}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-tight mb-2 line-clamp-2">{card.front}</h4>
                        <p className="text-[10px] text-[hsl(var(--text-muted))] line-clamp-2">{card.back}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-[hsl(var(--border))]">
              <button onClick={() => { setSelectedSourceMission(''); setMissionFilterMateria('Todas'); setMissionFilterAssunto('Todos'); }} className="px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] transition-all">Cancelar</button>
              <button
                onClick={handleImportFromMission}
                disabled={filteredMissionCards.length === 0 || missionLoading || importingState.loading}
                className="px-8 py-3 bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[hsl(var(--bg-main))] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-3 transition-all active:scale-95"
              >
                {importingState.loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                Clonar {filteredMissionCards.length} Flashcards
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionImportModal;
