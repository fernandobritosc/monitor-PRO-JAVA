import React from 'react';
import { Target, Zap, Waves, Activity } from 'lucide-react';
import KPICard from '../../shared/KPICard';

interface KPIRowProps {
  precision: number;
  totalHours: number;
  totalQuestions: number;
  daysUntilExam: number | null;
}

const KPIRow: React.FC<KPIRowProps> = ({ precision, totalHours, totalQuestions, daysUntilExam }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        label="Precisão Média"
        value={`${precision.toFixed(0)}%`}
        percentage={precision}
        icon={<Target size={24} />}
        color={precision >= 80 ? '142 71% 45%' : '188 86% 53%'}
        trend={precision >= 80 ? 1 : 0}
        trendUp={precision >= 80}
      />
      <KPICard
        label="Tempo Investido"
        value={`${totalHours.toFixed(0)}h`}
        percentage={Math.min((totalHours / 200) * 100, 100)}
        icon={<Zap size={24} />}
        color="262 83% 58%"
      />
      <KPICard
        label="Volume de Questões"
        value={totalQuestions.toLocaleString()}
        percentage={Math.min((totalQuestions / 1000) * 100, 100)}
        icon={<Waves size={24} />}
        color="330 81% 60%"
      />
      <KPICard
        label="Rumo ao Objetivo"
        value={daysUntilExam !== null ? `${daysUntilExam}d` : '--'}
        percentage={typeof daysUntilExam === 'number' ? Math.max(0, Math.min(100, (daysUntilExam / 90) * 100)) : 0}
        icon={<Activity size={24} />}
        color="46 97% 55%"
      />
    </div>
  );
};

export default KPIRow;
