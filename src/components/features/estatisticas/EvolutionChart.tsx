import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface EvolutionPoint {
  date: string;
  label: string;
  questions: number;
  precision: number | null;
}

interface EvolutionChartProps {
  data: EvolutionPoint[];
}

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.8)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
};

const EvolutionChart: React.FC<EvolutionChartProps> = ({ data }) => {
  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-6">
        Evolução no tempo
      </h3>
      <div className="w-full h-[320px] md:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--text-muted))"
              fontSize={10}
              minTickGap={8}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--text-muted))"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--text-muted))"
              fontSize={10}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              formatter={(value, name) =>
                name === 'precision'
                  ? [value == null ? '-' : `${Number(value).toFixed(1)}%`, 'Desempenho']
                  : [`${value} questões`, 'Questões']
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="questions"
              name="questions"
              stroke="#2dd4bf"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#2dd4bf' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="precision"
              name="precision"
              stroke="#7c3aed"
              strokeWidth={2}
              connectNulls
              dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#7c3aed' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-[10px] font-bold text-[hsl(var(--text-muted))]">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]" /> Questões
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" /> Desempenho
        </span>
      </div>
    </div>
  );
};

export default EvolutionChart;
