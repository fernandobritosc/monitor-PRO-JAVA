import React, { useMemo } from 'react';
import { Calendar, List, Layers, Clock } from 'lucide-react';
import { EditalMateria } from '../../../types';
import { ExamBoard, EXAM_BOARDS } from '../../../constants/examBoards';

interface SimuladoFormSectionProps {
  materiasDisponiveis: EditalMateria[];
  dataEstudo: string;
  onDataEstudoChange: (val: string) => void;
  assunto: string;
  onAssuntoChange: (val: string) => void;
  tempoHHMM: string;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  simuladoScores: Record<string, { acertos: string; total: string }>;
  onSimuladoScoreChange: (materia: string, field: 'acertos' | 'total', val: string) => void;
  board: ExamBoard;
  onBoardChange: (board: ExamBoard) => void;
}

const SimuladoFormSection: React.FC<SimuladoFormSectionProps> = ({
  materiasDisponiveis, dataEstudo, onDataEstudoChange,
  assunto, onAssuntoChange, tempoHHMM, onTimeChange,
  simuladoScores, onSimuladoScoreChange,
  board, onBoardChange
}) => {
  const simuladoStats = useMemo(() => {
    let totalAcertos = 0;
    let totalQuestoes = 0;
    let weightedPoints = 0;
    let maxWeightedPoints = 0;

    materiasDisponiveis.forEach(m => {
      const s = simuladoScores[m.materia];
      if (s) {
        const a = parseInt(s.acertos || '0');
        const t = parseInt(s.total || '0');
        const peso = m.peso || 1;

        if (!isNaN(a)) totalAcertos += a;
        if (!isNaN(t)) totalQuestoes += t;
        if (!isNaN(a)) weightedPoints += (a * peso);
        if (!isNaN(t)) maxWeightedPoints += (t * peso);
      }
    });

    return {
      acertos: totalAcertos,
      total: totalQuestoes,
      perc: totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0,
      weighted: weightedPoints,
      maxWeighted: maxWeightedPoints
    };
  }, [simuladoScores, materiasDisponiveis]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
            <Calendar size={14} className="text-[hsl(var(--accent))]" /> Data da Prova
          </label>
          <input type="date" required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black uppercase tracking-widest" value={dataEstudo} onChange={(e) => onDataEstudoChange(e.target.value)} />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
            <List size={14} className="text-[hsl(var(--accent))]" /> Nome do Simulado
          </label>
          <input type="text" required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-bold placeholder-[hsl(var(--text-muted)/0.5)]" value={assunto} onChange={(e) => onAssuntoChange(e.target.value)} placeholder="Ex: 1º Simulado TJ-SP" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Banca / Exam Board Selector */}
        <div className="bg-[#1E2230]/60 border border-[#2A2F3E] rounded-2xl p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Layers size={14} className="text-[hsl(var(--accent))]" /> Banca Organizadora
              </label>
              <select
                value={board}
                onChange={(e) => onBoardChange(e.target.value as ExamBoard)}
                className="bg-[#1E2230] border border-[#2A2F3E] rounded-lg px-3 py-2 text-white text-sm font-bold w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all"
              >
                {Object.entries(EXAM_BOARDS).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <div className="text-xs text-[hsl(var(--text-muted))] bg-[#1E2230]/40 border border-[#2A2F3E]/50 rounded-lg px-3 py-2 leading-relaxed">
                {EXAM_BOARDS[board].description}
                {EXAM_BOARDS[board].negativeMarking && (
                  <span className="block mt-1 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                    ⚠ Penalidade: -{EXAM_BOARDS[board].negativeValue} por erro
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-4">
          <label className="text-[11px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers size={14} className="text-[hsl(var(--accent))]" /> Desempenho por Matéria
          </label>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest border-b border-[hsl(var(--border))]">
          <div className={board === 'CESPE' ? 'col-span-5' : 'col-span-6'}>Matéria / Peso</div>
          <div className={board === 'CESPE' ? 'col-span-2 text-center' : 'col-span-3 text-center'}>Acertos</div>
          <div className={board === 'CESPE' ? 'col-span-2 text-center' : 'col-span-3 text-center'}>Total</div>
          {board === 'CESPE' && <div className="col-span-3 text-center text-yellow-400">Em Branco</div>}
        </div>

        <div className="glass-premium rounded-3xl p-2 border border-[hsl(var(--border))] space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
          {materiasDisponiveis.map(mat => {
            const score = simuladoScores[mat.materia] || { acertos: '', total: '' };
            const a = parseInt(score.acertos || '0');
            const t = parseInt(score.total || '0');
            const isInvalid = t > 0 && a > t;

            return (
              <div key={mat.materia} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 items-center p-3 md:p-2 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 md:border-0 last:border-0">
                <div className={`col-span-2 ${board === 'CESPE' ? 'md:col-span-5' : 'md:col-span-6'} flex justify-between md:block items-center mb-1 md:mb-0`}>
                  <div className="font-bold text-sm text-[hsl(var(--text-main))] truncate" title={mat.materia}>{mat.materia}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase bg-[hsl(var(--bg-user-block))] px-2 py-0.5 rounded md:bg-transparent md:px-0">Peso {mat.peso || 1}</div>
                </div>

                <div className={`col-span-1 ${board === 'CESPE' ? 'md:col-span-2' : 'md:col-span-3'} relative`}>
                  <label className="md:hidden text-[9px] text-slate-500 font-bold uppercase mb-1 block">Acertos</label>
                  <input
                    type="number"
                    placeholder="0"
                    className={`w-full bg-[hsl(var(--bg-user-block))] border ${isInvalid ? 'border-red-500 text-red-400' : 'border-[hsl(var(--border))] text-green-500 dark:text-green-400'} rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    value={score.acertos}
                    onChange={e => onSimuladoScoreChange(mat.materia, 'acertos', e.target.value)}
                  />
                </div>
                <div className={`col-span-1 ${board === 'CESPE' ? 'md:col-span-2' : 'md:col-span-3'} relative`}>
                  <label className="md:hidden text-[9px] text-slate-500 font-bold uppercase mb-1 block">Total</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold text-[hsl(var(--text-bright))] focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={score.total}
                    onChange={e => onSimuladoScoreChange(mat.materia, 'total', e.target.value)}
                  />
                </div>
                {board === 'CESPE' && (
                  <div className="col-span-1 md:col-span-3 relative">
                    <label className="md:hidden text-[9px] text-yellow-500 font-bold uppercase mb-1 block">Em Branco</label>
                    <div className="w-full bg-[hsl(var(--bg-user-block))] border border-dashed border-[#2A2F3E] rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold text-[hsl(var(--text-muted))]">
                      —
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Clock size={14} className="text-[hsl(var(--accent))]" /> Tempo Total de Prova
            </label>
            <input type="text" placeholder="HH:MM" maxLength={5} required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black text-center text-lg" value={tempoHHMM} onChange={onTimeChange} />
          </div>

          <div className="glass-premium bg-gradient-to-r from-[hsl(var(--bg-user-block))] to-[hsl(var(--bg-card))] p-6 rounded-3xl border border-[hsl(var(--border))] flex flex-col justify-center shadow-2xl gap-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-1">Aproveitamento</div>
                <div className={`text-2xl font-black uppercase tracking-tighter ${simuladoStats.perc >= 80 ? 'text-green-400' : simuladoStats.perc >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {simuladoStats.perc.toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[hsl(var(--text-bright))] leading-none tracking-tighter">
                  {simuladoStats.acertos} <span className="text-base text-[hsl(var(--text-muted))] font-medium">/ {simuladoStats.total}</span>
                </div>
                <div className="text-[9px] text-[hsl(var(--text-muted))] uppercase font-black tracking-widest mt-1">Questões Totais</div>
              </div>
            </div>
            {simuladoStats.maxWeighted > 0 && (
              <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-between items-center">
                <div className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-widest">Pontuação Ponderada</div>
                <div className="text-base font-black text-[hsl(var(--text-bright))] tracking-tighter">
                  {simuladoStats.weighted.toFixed(1)} <span className="text-[hsl(var(--text-muted))] text-xs">/ {simuladoStats.maxWeighted}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SimuladoFormSection;
