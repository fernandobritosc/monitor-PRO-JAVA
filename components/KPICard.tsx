import React from 'react';

interface KPICardProps {
    label: string;
    value: string;
    percentage: number;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    color: string; // HSL color core without hsl() wrapper
}

const KPICard: React.FC<KPICardProps> = ({ label, value, percentage, icon, trend, trendUp, color }) => {
    return (
        <div className="glass-premium rounded-3xl p-6 group transition-all duration-500 hover:-translate-y-1 active:scale-95 shadow-2xl">

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-lg"
                        style={{
                            backgroundColor: `hsl(${color} / 0.1)`,
                            color: `hsl(${color})`,
                            border: `1px solid hsl(${color} / 0.2)`
                        }}
                    >
                        {icon}
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))] block mb-1">
                            Desempenho
                        </span>
                        <div className="flex items-center gap-1 justify-end font-black text-xs">
                            <span style={{ color: `hsl(${color})` }}>{percentage.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <h4 className="text-[11px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest mb-1">
                        {label}
                    </h4>
                    <div className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter flex items-baseline gap-2">
                        {value}
                        {trend && (
                            <span className={`text-[10px] font-bold ${trendUp ? 'text-green-400' : 'text-red-400'} tracking-normal`}>
                                {trendUp ? '↑' : '↓'} {trend}
                            </span>
                        )}
                    </div>
                </div>

                {/* Mini Progress Bar */}
                <div className="h-1.5 w-full bg-[hsl(var(--bg-user-block))] rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: `hsl(${color})`,
                            boxShadow: `0 0 15px hsl(${color} / 0.5)`
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default KPICard;
