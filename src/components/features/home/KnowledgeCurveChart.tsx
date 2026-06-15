import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface KnowledgeCurveChartProps {
  data: { date: string; precision: number }[];
  formatDateLabel: (d: string) => string;
  formatFullDate: (d: string) => string;
}

const KnowledgeCurveChart: React.FC<KnowledgeCurveChartProps> = ({ data, formatDateLabel, formatFullDate }) => {
  const colorOffset = useMemo(() => {
    if (data.length === 0) return 0;
    const precisions = data.map(i => i.precision);
    const max = Math.max(...precisions);
    const min = Math.min(...precisions);
    if (max <= 80) return 0;
    if (min >= 80) return 1;
    return (max - 80) / (max - min);
  }, [data]);

  return (
    <div className="lg:col-span-2 glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col h-[400px] md:h-[500px]">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 shrink-0 gap-4">
        <div>
          <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase">
            <div className="w-1.5 h-6 bg-[hsl(var(--accent))] rounded-full" />
            Curva de Conhecimento
          </h3>
          <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em] mt-1 ml-4">Monitoramento de precisão por data</p>
        </div>
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
          <div className="flex items-center gap-2 text-green-400"><div className="w-2 h-2 bg-green-400 rounded-full" /><span>Elite (80%)</span></div>
          <div className="flex items-center gap-2 text-yellow-400"><div className="w-2 h-2 bg-yellow-400 rounded-full" /><span>Base (60%)</span></div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrecision" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="#4ade80" />
                <stop offset={colorOffset} stopColor="#4ade80" />
                <stop offset={colorOffset} stopColor="#facc15" />
                <stop offset={1} stopColor="#facc15" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
            <XAxis dataKey="date" stroke="hsl(var(--text-muted))" fontSize={9} tickFormatter={formatDateLabel} minTickGap={40} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(var(--text-muted))" fontSize={9} domain={[0, 100]} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
              }}
              labelStyle={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              itemStyle={{ color: 'hsl(var(--accent))', fontWeight: '900', fontSize: '16px' }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'PRECISÃO']}
              labelFormatter={(label) => formatFullDate(label)}
            />
            <Area
              type="monotone"
              dataKey="precision"
              stroke="url(#lineGradient)"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorPrecision)"
              filter="url(#shadow)"
              activeDot={{ r: 8, fill: 'white', stroke: 'hsl(var(--accent))', strokeWidth: 4 }}
            />
            <ReferenceLine y={80} stroke="rgba(74,222,128,0.3)" strokeDasharray="8 8" />
            <ReferenceLine y={60} stroke="rgba(250,204,21,0.3)" strokeDasharray="8 8" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default KnowledgeCurveChart;
