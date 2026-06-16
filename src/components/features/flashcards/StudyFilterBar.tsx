import React from 'react';
import { Brain, BookOpen, Tag, Filter, Zap } from 'lucide-react';
import { CustomFilterDropdown } from '../../shared/CustomFilterDropdown';

interface StudyFilterBarProps {
  materias: string[];
  filterMateria: string;
  setFilterMateria: (val: string) => void;
  assuntos: string[];
  filterAssunto: string;
  setFilterAssunto: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  statusOptions: string[];
  cardsCount: number;
  studyQueue: unknown[];
  startStudySession: () => void;
}

export const StudyFilterBar: React.FC<StudyFilterBarProps> = ({
  materias, filterMateria, setFilterMateria,
  assuntos, filterAssunto, setFilterAssunto,
  filterStatus, setFilterStatus, statusOptions,
  cardsCount: _cardsCount, studyQueue, startStudySession,
}) => {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
        <h3 className="text-xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))] flex items-center gap-4">
          <Brain className="text-[hsl(var(--accent))]" /> Protocolo de Estudo
        </h3>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <CustomFilterDropdown label="Matéria" value={filterMateria} options={materias} onChange={setFilterMateria} icon={<BookOpen size={16} />} widthClass="w-full sm:w-56" />
          <CustomFilterDropdown label="Assunto" value={filterAssunto} options={assuntos} onChange={setFilterAssunto} icon={<Tag size={16} />} widthClass="w-full sm:w-56" />
          <CustomFilterDropdown label="Status" value={filterStatus} options={statusOptions} onChange={setFilterStatus} icon={<Filter size={16} />} widthClass="w-full sm:w-48" />
        </div>
      </div>

      <button
        onClick={() => {
          if (studyQueue.length > 0) {
            if (!window.confirm("Você já tem uma sessão em andamento. Deseja reiniciar e perder o progresso atual?")) {
              return;
            }
          }
          startStudySession();
        }}
        className="w-full lg:w-auto px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-[hsl(var(--bg-main))] rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95"
      >
        <Zap size={18} /> Iniciar Protocolo
      </button>
    </div>
  );
};
