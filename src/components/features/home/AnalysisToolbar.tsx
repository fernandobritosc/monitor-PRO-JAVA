import React from 'react';
import { Sparkles, GitCommit } from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_VERSION } from '../../../constants';
import { StudyRecord } from '../../../types';

interface AnalysisToolbarProps {
  filterPeriod: number;
  setFilterPeriod: (p: number) => void;
  setIsReleaseNotesOpen: (v: boolean) => void;
  records: StudyRecord[];
  activeRecords: StudyRecord[];
  missaoAtiva: string | null;
  showGlobalStats: boolean;
  setShowGlobalStats: (v: boolean) => void;
}

const AnalysisToolbar: React.FC<AnalysisToolbarProps> = ({
  filterPeriod,
  setFilterPeriod,
  setIsReleaseNotesOpen,
  records,
  activeRecords,
  missaoAtiva,
  showGlobalStats,
  setShowGlobalStats
}) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {records.length > 0 && activeRecords.length === 0 && missaoAtiva !== 'Escolha a sua missão' && !showGlobalStats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-2xl flex items-center gap-4"
          >
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-[hsl(var(--text-bright))] uppercase tracking-tight">Dados em outras missões!</p>
              <p className="text-[8px] text-[hsl(var(--text-muted))] font-bold uppercase">Total: {records.length} registros</p>
            </div>
            <button
              onClick={() => setShowGlobalStats(true)}
              className="px-3 py-1.5 bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] text-[9px] font-black rounded-lg uppercase hover:scale-105 transition-transform"
            >
              Ativar Visão Global
            </button>
          </motion.div>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[hsl(var(--accent-glow))] rounded-xl">
            <Sparkles size={20} className="text-[hsl(var(--accent))]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--text-bright))] uppercase tracking-widest">Motor de Análise</h3>
            <p className="text-[10px] text-[hsl(var(--text-muted))] font-medium uppercase tracking-[0.1em]">Visão analítica da sua performance</p>
          </div>
        </div>
        <button
          onClick={() => setIsReleaseNotesOpen(true)}
          className="px-4 py-2 flex items-center gap-2 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--border))] border border-[hsl(var(--border))] text-[hsl(var(--text-bright))] rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg"
        >
          <GitCommit size={14} className="text-[hsl(var(--accent))]" />
          v{APP_VERSION}
        </button>
      </div>
      <div className="flex p-1 bg-[hsl(var(--bg-sidebar)/0.5)] backdrop-blur-md border border-[hsl(var(--border))] rounded-2xl shadow-xl">
        {[{ label: '7 D', val: 7 }, { label: '30 D', val: 30 }, { label: 'ALL', val: 0 }].map(p => (
          <button
            key={p.val}
            onClick={() => setFilterPeriod(p.val)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${filterPeriod === p.val ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-white/5'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnalysisToolbar;
