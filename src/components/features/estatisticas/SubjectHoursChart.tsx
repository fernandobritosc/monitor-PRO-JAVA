import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

export interface SubjectHoursPoint {
  materia: string;
  short: string;
  minutes: number;
  hours: number;
}

interface SubjectHoursChartProps {
  data: SubjectHoursPoint[];
}

const formatTempo = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${String(m).padStart(2, '0')}min`;
};

const SubjectHoursChart: React.FC<SubjectHoursChartProps> = ({ data }) => {
  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8 flex flex-col h-full">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-6">
        Disciplinas x horas de estudo
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
          Nenhum estudo no período.
        </p>
      ) : (
        <div className="overflow-y-auto custom-scrollbar max-h-[420px] pr-1">
          <div style={{ height: Math.max(220, data.length * 52) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" horizontal={false} opacity={0.4} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--text-muted))"
                  fontSize={10}
                  tickFormatter={(v: number) => `${v}h`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="short"
                  stroke="hsl(var(--text-muted))"
                  fontSize={11}
                  width={150}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px', fontWeight: '900' }}
                  formatter={(_value: number | string, _name: string, props: { payload?: SubjectHoursPoint }) => [
                    formatTempo(props.payload?.minutes ?? 0),
                    'Tempo',
                  ]}
                />
                <Bar dataKey="hours" name="Tempo" fill="#2dd4bf" radius={[0, 6, 6, 0]} barSize={26}>
                  <LabelList
                    dataKey="minutes"
                    position="insideRight"
                    formatter={(v: number) => formatTempo(v)}
                    style={{ fill: '#fff', fontSize: 11, fontWeight: 800 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectHoursChart;
