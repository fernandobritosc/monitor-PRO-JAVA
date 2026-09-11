import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface StudyHoursPoint {
  date: string;
  label: string;
  hours: number;
  minutes: number;
}

interface StudyHoursChartProps {
  data: StudyHoursPoint[];
}

const StudyHoursChart: React.FC<StudyHoursChartProps> = ({ data }) => {
  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-6">
        Horas de estudo
      </h3>
      <div className="w-full h-[300px] md:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              stroke="hsl(var(--text-muted))"
              fontSize={10}
              tickFormatter={(v: number) => `${v}h`}
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
              labelStyle={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              formatter={(_value: number | string, _name: string, props: { payload?: StudyHoursPoint }) => {
                const minutes = props.payload?.minutes ?? 0;
                const h = Math.floor(minutes / 60);
                const m = Math.round(minutes % 60);
                return [`${h}h${String(m).padStart(2, '0')}min`, 'Tempo'];
              }}
            />
            <Bar dataKey="hours" name="Tempo" fill="#2dd4bf" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StudyHoursChart;
