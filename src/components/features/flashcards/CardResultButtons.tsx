import React from 'react';
import { RotateCcw, Brain, CheckCircle2, Zap } from 'lucide-react';

interface CardResultButtonsProps {
  onResult: (rating: 1 | 2 | 3 | 4) => void;
}

const buttons = [
  { rating: 1 as const, label: 'Novamente', sub: 'Reiniciar', color: 'red', icon: RotateCcw },
  { rating: 2 as const, label: 'Difícil', sub: 'Mais Cedo', color: 'orange', icon: Brain },
  { rating: 3 as const, label: 'Bom', sub: 'Padrão', color: 'green', icon: CheckCircle2 },
  { rating: 4 as const, label: 'Fácil', sub: 'Mais Longe', color: 'cyan', icon: Zap },
];

export const CardResultButtons: React.FC<CardResultButtonsProps> = ({ onResult }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {buttons.map(({ rating, label, sub, color, icon: Icon }) => (
        <button
          key={rating}
          onClick={() => onResult(rating)}
          className={`group flex flex-col items-center justify-center gap-2 p-6 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-400 border border-${color}-500/30 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg`}
        >
          <Icon size={24} className={`group-hover:${rating === 1 ? 'rotate-[-45deg]' : 'scale-110'} transition-transform`} />
          <span className="text-[9px]">{label}</span>
          <span className="text-[7px] opacity-60">{sub}</span>
        </button>
      ))}
    </div>
  );
};
