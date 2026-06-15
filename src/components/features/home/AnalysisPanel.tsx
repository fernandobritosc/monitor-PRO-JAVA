import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  Legend
} from 'recharts';

interface AnalysisDataItem {
  materia: string;
  tempo?: number;
  precision?: number;
}

interface AnalysisPanelProps {
  analysisTab: string;
  setAnalysisTab: (tab: 'time' | 'precision' | 'comparative') => void;
  timeData: AnalysisDataItem[];
  precisionData: AnalysisDataItem[];
  comparativeData: AnalysisDataItem[];
}

const CustomYAxisTick = (props: { x: number; y: number; payload: { value: string | number } }) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={0} dy={4} textAnchor="end" fill="hsl(var(--text-muted))" fontSize={9} fontWeight={900} className="uppercase tracking-widest">
        {payload.value}
      </text>
    </g>
  );
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysisTab, setAnalysisTab, timeData, precisionData, comparativeData }) => {
  return (
    <div className="glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col">
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <button onClick={() => setAnalysisTab('time')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'time' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Distribuição de Tempo</button>
        <button onClick={() => setAnalysisTab('precision')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'precision' ? 'bg-green-500 text-white' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Assertividade</button>
        <button onClick={() => setAnalysisTab('comparative')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'comparative' ? 'bg-[#facc15] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Comparativo</button>
      </div>
      <div className="flex-1 w-full min-h-[250px]">
        {analysisTab === 'comparative' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativeData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }} barGap={2}>
              <XAxis type="number" xAxisId="time" hide />
              <XAxis type="number" domain={[0, 100]} xAxisId="precision" hide />
              <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={250} tick={CustomYAxisTick} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }}
                itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                labelStyle={{ color: 'hsl(var(--text-muted))', fontSize: '10px', textTransform: 'uppercase' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Tempo') return [`${Math.floor(value / 60)}h ${value % 60}m`, 'TEMPO'];
                  return [`${value.toFixed(1)}%`, 'ASSERTIVIDADE'];
                }}
              />
              <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              <Bar dataKey="tempo" xAxisId="time" name="Tempo" fill="hsl(var(--accent))" radius={[0, 10, 10, 0]} barSize={8}>
                <LabelList dataKey="tempo" position="right" fill="hsl(var(--text-muted))" fontSize={8} fontWeight="bold" formatter={(v: number) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}m`} />
              </Bar>
              <Bar dataKey="precision" xAxisId="precision" name="Assertividade" radius={[0, 10, 10, 0]} barSize={8}>
                <LabelList dataKey="precision" position="right" fill="hsl(var(--text-muted))" fontSize={8} fontWeight="bold" formatter={(v: number) => `${v.toFixed(0)}%`} />
                {comparativeData.map((e, i) => (
                  <Cell key={`c-${i}`} fill={e.precision !== undefined ? (e.precision >= 80 ? '#4ade80' : e.precision >= 60 ? '#facc15' : '#ef4444') : '#4ade80'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : analysisTab === 'time' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={250} tick={CustomYAxisTick} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }}
                itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                formatter={(v: number) => [`${Math.floor(v / 60)}h ${v % 60}m`, 'TEMPO']}
              />
              <Bar dataKey="tempo" radius={[0, 10, 10, 0]} barSize={12}>
                <LabelList dataKey="tempo" position="right" fill="hsl(var(--text-muted))" fontSize={9} fontWeight="bold" formatter={(v: number) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}m`} />
                {timeData.map((e, i) => <Cell key={`c-${i}`} fill="hsl(var(--accent))" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={precisionData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={250} tick={CustomYAxisTick} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }}
                itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'PRECISÃO']}
              />
              <Bar dataKey="precision" radius={[0, 10, 10, 0]} barSize={12}>
                <LabelList dataKey="precision" position="right" fill="hsl(var(--text-muted))" fontSize={9} fontWeight="bold" formatter={(v: number) => `${v.toFixed(0)}%`} />
                {precisionData.map((e, i) => (
                  <Cell key={`c-${i}`} fill={e.precision !== undefined ? (e.precision >= 80 ? '#4ade80' : e.precision >= 60 ? '#facc15' : '#ef4444') : '#4ade80'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
