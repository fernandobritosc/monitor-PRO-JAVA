import React, { useRef } from 'react';
import { CalendarDays, Eye, TrendingUp } from 'lucide-react';

interface DailySummaryItem {
  materia: string;
  tipo: string;
  time: number;
  questions: number;
}

interface DailySummaryPanelProps {
  summaryDate: string;
  summaryData: DailySummaryItem[];
  summaryMinutes: number;
  summaryQuestions: number;
  onDateChange: (date: string) => void;
}

const formatFullDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const DailySummaryPanel: React.FC<DailySummaryPanelProps> = ({
  summaryDate,
  summaryData,
  summaryMinutes,
  summaryQuestions,
  onDateChange
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isToday = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return summaryDate === `${year}-${month}-${day}`;
  })();

  return (
    <div className="lg:col-span-1 glass-premium rounded-[2.5rem] flex flex-col overflow-hidden h-[450px] md:h-[500px]">
      <div className="p-8 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block)/0.3)] flex justify-between items-start shrink-0">
        <div>
          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] ${isToday ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'bg-yellow-500/20 text-yellow-500'}`}>
            {isToday ? 'Hoje' : 'Histórico'}
          </span>
          <h2 className="text-2xl font-black text-[hsl(var(--text-bright))] mt-3 tracking-tighter uppercase leading-none">
            Resumo {isToday ? 'Hoje' : formatFullDate(summaryDate).substring(0, 5)}
          </h2>
        </div>
        <div className="relative group/picker">
          <div className="bg-[hsl(var(--bg-main))] p-3 rounded-2xl text-[hsl(var(--text-muted))] group-hover/picker:text-[hsl(var(--accent))] group-hover/picker:bg-[hsl(var(--bg-user-block))] cursor-pointer transition-all border border-[hsl(var(--border))] shadow-lg">
            <CalendarDays size={20} />
          </div>
          <input type="date" ref={dateInputRef} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={summaryDate} onChange={(e) => onDateChange(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {summaryData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-16 h-16 rounded-3xl bg-[hsl(var(--bg-user-block))] flex items-center justify-center mb-4"><Eye size={32} /></div>
            <p className="text-xs font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum registro</p>
          </div>
        ) : (
          summaryData.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-[hsl(var(--bg-user-block)/0.3)] border border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-user-block)/0.5)] transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-1 h-8 rounded-full opacity-40 group-hover:opacity-100 ${data.tipo === 'Revisão' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-[hsl(var(--accent))]'}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[hsl(var(--text-bright))] tracking-tight leading-none group-hover:text-[hsl(var(--accent))] transition-colors">
                    {data.materia}
                  </span>
                  <span className={`text-[7px] font-black uppercase tracking-[0.2em] mt-1.5 w-fit px-2 py-0.5 rounded-sm ${data.tipo === 'Revisão' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.1)]'}`}>
                    {data.tipo}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-[hsl(var(--text-bright))]">{formatTime(data.time)}</div>
                <div className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest mt-1">{data.questions} Questões</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-6 bg-[hsl(var(--bg-sidebar)/0.5)] border-t border-[hsl(var(--border))] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <span className="block text-xl font-black text-[hsl(var(--text-bright))] leading-none tracking-tighter">{Math.floor(summaryMinutes / 60)}h{summaryMinutes % 60}m</span>
            <span className="text-[9px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest">Tempo</span>
          </div>
          <div className="w-px h-8 bg-[hsl(var(--border))]"></div>
          <div>
            <span className="block text-xl font-black text-[hsl(var(--accent))] leading-none tracking-tighter">{summaryQuestions}</span>
            <span className="text-[9px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest">Questões</span>
          </div>
        </div>
        <div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-xl"><TrendingUp size={16} className="text-[hsl(var(--accent))]" /></div>
      </div>
    </div>
  );
};

export default DailySummaryPanel;
