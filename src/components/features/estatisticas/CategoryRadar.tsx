import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface CategoryPoint {
  category: string;
  minutes: number;
  label: string;
}

interface CategoryRadarProps {
  data: CategoryPoint[];
}

const formatTempo = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${String(m).padStart(2, '0')}min`;
};

const CategoryRadar: React.FC<CategoryRadarProps> = ({ data }) => {
  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8 flex flex-col h-full">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-6">
        Categorias x horas de estudo
      </h3>
      {data.every((d) => d.minutes === 0) ? (
        <p className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
          Nenhum estudo no período.
        </p>
      ) : (
        <div className="w-full flex-1 min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                formatter={(value) => [formatTempo(Number(value) || 0), 'Tempo']}
              />
              <Radar
                dataKey="minutes"
                stroke="#2dd4bf"
                fill="#2dd4bf"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CategoryRadar;
