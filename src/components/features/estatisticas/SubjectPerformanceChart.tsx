import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

export interface SubjectPerformancePoint {
  materia: string;
  short: string;
  total: number;
  correct: number;
  wrong: number;
  precision: number;
}

interface SubjectPerformanceChartProps {
  data: SubjectPerformancePoint[];
}

interface BadgeProps {
  x?: number;
  y?: number;
  value?: number;
}

const PrecisionBadge: React.FC<BadgeProps> = ({ x = 0, y = 0, value = 0 }) => {
  const text = `${Math.round(value)}`;
  const w = text.length * 7 + 12;
  const h = 18;
  return (
    <g>
      <rect x={x - w / 2} y={y - h - 4} width={w} height={h} rx={4} fill="#7c3aed" />
      <text x={x} y={y - h / 2} textAnchor="middle" fontSize={10} fontWeight={800} fill="#ffffff">
        {text}
      </text>
    </g>
  );
};

interface TooltipRow {
  payload?: SubjectPerformancePoint;
}

const PerformanceTooltip: React.FC<{ active?: boolean; payload?: TooltipRow[]; label?: string }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
        padding: '12px 16px',
        fontSize: '12px',
      }}
    >
      <p style={{ fontWeight: 800, marginBottom: 8 }}>{p.materia}</p>
      <p>
        <span style={{ color: '#2dd4bf' }}>●</span> Total: {p.total} Questões
      </p>
      <p>
        <span style={{ color: '#7c3aed' }}>●</span> Desempenho: {Math.round(p.precision)}%
      </p>
      <p style={{ marginTop: 8 }}>Acertos: {p.correct} Questões</p>
      <p>Erros: {p.wrong} Questões</p>
    </div>
  );
};

const SubjectPerformanceChart: React.FC<SubjectPerformanceChartProps> = ({ data }) => {
  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-6">
        Disciplinas x desempenho
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
          Nenhum estudo no período.
        </p>
      ) : (
        <>
          <div className="w-full h-[340px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="short"
                  stroke="hsl(var(--text-muted))"
                  fontSize={10}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={90}
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
                <Tooltip content={<PerformanceTooltip />} />
                <Bar yAxisId="left" dataKey="total" name="Questões" fill="#2dd4bf" radius={[6, 6, 0, 0]} maxBarSize={64} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="precision"
                  name="Desempenho"
                  stroke="transparent"
                  dot={false}
                  activeDot={false}
                >
                  <LabelList dataKey="precision" position="top" content={<PrecisionBadge />} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-6 text-[10px] font-bold text-[hsl(var(--text-muted))]">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]" /> Questões
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" /> Desempenho
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default SubjectPerformanceChart;
