import React from 'react';
import { motion } from 'framer-motion';

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
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass-premium rounded-3xl p-6 group transition-all duration-500 shadow-2xl relative overflow-hidden"
        >
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{
                            backgroundColor: `hsl(${color} / 0.1)`,
                            color: `hsl(${color})`,
                            border: `1px solid hsl(${color} / 0.2)`
                        }}
                    >
                        {icon}
                    </motion.div>
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

                {/* Mini Progress Bar with Motion */}
                <div className="h-1.5 w-full bg-[hsl(var(--bg-user-block))] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                            backgroundColor: `hsl(${color})`,
                            boxShadow: `0 0 15px hsl(${color} / 0.5)`
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default KPICard;
