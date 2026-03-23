import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface PieChartComponentProps {
    data: any[];
    colors: string[];
    score: number;
    total: number;
}

export const PieChartComponent: React.FC<PieChartComponentProps> = ({ data, colors, score, total }) => {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    return (
        <div className="relative h-40 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={5}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Corrigido: text-white -> variável de tema */}
                <span className="text-3xl font-black text-[hsl(var(--text-bright))]">{percentage.toFixed(0)}%</span>
            </div>
            <div className="absolute bottom-0 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {/* Corrigido: text-slate-400 / text-white -> variáveis de tema */}
                    <span className="text-[hsl(var(--text-muted))]">Acertos:</span>
                    <span className="font-bold text-[hsl(var(--text-bright))]">{score}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[hsl(var(--text-muted))]">Erros:</span>
                    <span className="font-bold text-[hsl(var(--text-bright))]">{total - score}</span>
                </div>
            </div>
        </div>
    );
};