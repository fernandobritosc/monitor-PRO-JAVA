import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface KPICardProps {
  label: string;
  value: string | number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  trendUp?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, percentage, icon, color, trend, trendUp }) => {
  return (
    <div className="glass-premium p-6 rounded-[2rem] relative overflow-hidden group">
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"
        style={{ background: `radial-gradient(circle at center, hsl(${color}) 0%, transparent 70%)` }}
      />
      <div className="flex justify-between items-start mb-6">
        <div className="p-3.5 rounded-2xl bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] group-hover:scale-110 transition-transform duration-500 shadow-lg">
          <div style={{ color: `hsl(${color})` }}>{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
            trendUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          )}>
            {trend}
          </div>
        )}
      </div>
      <span className="block text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mb-1">{label}</span>
      <h3 className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{value}</h3>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[hsl(var(--bg-user-block))] rounded-full overflow-hidden border border-[hsl(var(--border))]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: 'circOut' }}
            className="h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        </div>
        <span className="text-[9px] font-black text-[hsl(var(--text-muted))]">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
};

export default KPICard;
