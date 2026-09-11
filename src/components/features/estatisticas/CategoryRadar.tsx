import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
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

interface VertexLabelProps {
  x?: number;
  y?: number;
  value?: number;
}

const VertexLabel: React.FC<VertexLabelProps> = ({ x = 0, y = 0, value = 0 }) => {
  const text = formatTempo(value);
  const w = text.length * 6.5 + 12;
  const h = 18;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={4}
        fill="#10b981"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={800}
        fill="#ffffff"
      >
        {text}
      </text>
    </g>
  );
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
              <Radar
                dataKey="minutes"
                stroke="#2dd4bf"
                fill="#2dd4bf"
                fillOpacity={0.25}
                label={<VertexLabel />}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CategoryRadar;
