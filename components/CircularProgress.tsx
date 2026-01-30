
import React from 'react';

interface CircularProgressProps {
  percentage: number;
  label: string;
  value: string;
  icon?: string;
  colorStart?: string;
  colorEnd?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  label,
  value,
  icon,
  colorStart = '#8B5CF6',
  colorEnd = '#06B6D4'
}) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const gradientId = `grad-${label.replace(/\s+/g, '-')}-${percentage}`;

  return (
    <div className="glass rounded-xl p-3 flex flex-col items-center justify-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]">
      <div className="relative w-24 h-24 mb-3">
        <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgba(139, 92, 246, 0.1)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg leading-none">{icon}</span>
          <span className="text-base font-bold text-white mt-1">{value}</span> {/* Reduzido de text-lg font-extrabold */}
        </div>
      </div>
      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold text-center"> {/* Reduzido de text-[10px] text-slate-400 */}
        {label}
      </div>
    </div>
  );
};

export default CircularProgress;