import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useEditais } from '../hooks/queries/useEditais';
import { ReleaseNotesModal } from '../components/ui/ReleaseNotesModal';
import MissionBanner from '../components/features/home/MissionBanner';
import AnalysisToolbar from '../components/features/home/AnalysisToolbar';
import KPIRow from '../components/features/home/KPIRow';
import SubjectPanel from '../components/features/home/SubjectPanel';
import RecentActivities from '../components/features/home/RecentActivities';
import KnowledgeCurveChart from '../components/features/home/KnowledgeCurveChart';
import DailySummaryPanel from '../components/features/home/DailySummaryPanel';
import ConsistencyHeatmap from '../components/features/home/ConsistencyHeatmap';


const HomeView: React.FC = () => {
  const { missaoAtiva } = useAppStore();
  const { session } = useAuth();
  const { studyRecords: records = [] } = useStudyRecords(session?.user?.id);
  const { editais = [] } = useEditais(session?.user?.id);
  const [filterPeriod, setFilterPeriod] = useState<number>(30);
  const [showGlobalStats, setShowGlobalStats] = useState(false);

  const getLocalTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [summaryDate, setSummaryDate] = useState(getLocalTodayStr());
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

  const activeRecords = useMemo(() => {
    const hasRecordsInActiveMission = records.some(rec => rec.concurso === missaoAtiva);
    const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva || !hasRecordsInActiveMission;

    const baseRecords = records
      .filter(r => isGlobal ? true : r.concurso === missaoAtiva)
      .sort((a, b) => new Date(a.data_estudo).getTime() - new Date(b.data_estudo).getTime());

    if (filterPeriod === 0) return baseRecords;

    const now = new Date();
    const limitMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - filterPeriod);

    return baseRecords.filter(r => {
      const [y, m, d] = r.data_estudo.split('-').map(Number);
      const recordMs = Date.UTC(y, m - 1, d);
      return recordMs >= limitMs;
    });
  }, [records, missaoAtiva, filterPeriod]);

  const summaryRecords = records.filter(r => (missaoAtiva === 'Escolha a sua missão' || !missaoAtiva ? true : r.concurso === missaoAtiva) && r.data_estudo === summaryDate);

  const summaryStatsByMateria = useMemo(() => {
    const stats: Record<string, { time: number; questions: number; tipo: string }> = {};
    summaryRecords.forEach(r => {
      const type = r.tipo || 'Estudo';
      const key = `${r.materia}|${type}`;
      if (!stats[key]) stats[key] = { time: 0, questions: 0, tipo: type };
      stats[key].time += r.tempo;
      stats[key].questions += r.total;
    });

    return Object.entries(stats)
      .map(([key, data]) => ({
        materia: key.split('|')[0],
        tipo: data.tipo,
        time: data.time,
        questions: data.questions
      }))
      .sort((a, b) => b.time - a.time);
  }, [summaryRecords]);

  const summaryMinutes = summaryRecords.reduce((acc, r) => acc + r.tempo, 0);
  const summaryQuestions = summaryRecords.reduce((acc, r) => acc + r.total, 0);

  const totalQuestions = activeRecords.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  const totalCorrect = activeRecords.reduce((acc, r) => acc + (Number(r.acertos) || 0), 0);
  const precision = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalHours = activeRecords.reduce((acc, r) => acc + (Number(r.tempo) || 0), 0) / 60;

  const subjectStats = useMemo(() => {
    const map = new Map<string, { time: number; correct: number; total: number }>();
    activeRecords
      .filter(r => (r.tipo || 'Estudo') !== 'Simulado')
      .forEach(r => {
        const entry = map.get(r.materia) || { time: 0, correct: 0, total: 0 };
        entry.time += Number(r.tempo) || 0;
        entry.correct += Number(r.acertos) || 0;
        entry.total += Number(r.total) || 0;
        map.set(r.materia, entry);
      });
    return [...map.entries()]
      .map(([materia, s]) => ({ materia, ...s }))
      .sort((a, b) => b.time - a.time);
  }, [activeRecords]);

  const simuladoStats = useMemo(() => {
    const totals = { time: 0, correct: 0, total: 0 };
    activeRecords
      .filter(r => (r.tipo || '') === 'Simulado')
      .forEach(r => {
        totals.time += Number(r.tempo) || 0;
        totals.correct += Number(r.acertos) || 0;
        totals.total += Number(r.total) || 0;
      });
    return totals;
  }, [activeRecords]);

  const daysUntilExam = useMemo(() => {
    const activeEdital = editais.find(e => e.concurso === missaoAtiva);
    if (!activeEdital?.data_prova) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [ano, mes, dia] = activeEdital.data_prova.split('-').map(Number);
    const exam = new Date(ano, mes - 1, dia);
    const diffTime = exam.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
  }, [editais, missaoAtiva]);

  const evolutionData = useMemo(() => {
    const aggregated = activeRecords.reduce((acc: { date: string, correct: number, total: number, precision: number }[], r) => {
      const existing = acc.find(i => i.date === r.data_estudo);
      const rAcertos = Number(r.acertos);
      const rTotal = Number(r.total);

      if (existing) {
        existing.correct += rAcertos;
        existing.total += rTotal;
      } else {
        acc.push({
          date: r.data_estudo,
          correct: rAcertos,
          total: rTotal,
          precision: 0
        });
      }
      return acc;
    }, []);

    let lastPrecision = 0;

    return aggregated.map(day => {
      if (day.total > 0) {
        day.precision = (day.correct / day.total) * 100;
        lastPrecision = day.precision;
      } else {
        day.precision = lastPrecision;
      }
      return day;
    });
  }, [activeRecords]);

  const heatmapData = useMemo(() => {
    const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva;
    const allMissionRecords = records.filter(r => isGlobal ? true : r.concurso === missaoAtiva);
    const days: { date: string, minutes: number, intensity: number }[] = [];
    const studyMap = new Map<string, number>();
    allMissionRecords.forEach(r => studyMap.set(r.data_estudo, (studyMap.get(r.data_estudo) || 0) + r.tempo));

    for (let i = 119; i >= 0; i--) {
      const d = new Date();
      d.setDate(new Date().getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const minutes = studyMap.get(dateStr) || 0;
      let intensity = 0;
      if (minutes > 0) intensity = 1; if (minutes > 60) intensity = 2;
      if (minutes > 120) intensity = 3; if (minutes > 240) intensity = 4;
      days.push({ date: dateStr, minutes, intensity });
    }
    return days;
  }, [records, missaoAtiva]);

  const streakStats = useMemo(() => {
    const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva;
    const studyMap = new Map<string, number>();
    records
      .filter(r => isGlobal ? true : r.concurso === missaoAtiva)
      .forEach(r => studyMap.set(r.data_estudo, (studyMap.get(r.data_estudo) || 0) + Number(r.tempo || 0)));

    if (studyMap.size === 0) return { current: 0, record: 0, daysOff: 0, byDate: {} as Record<string, number> };

    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const toDayNum = (iso: string) => {
      const [y, m, day] = iso.split('-').map(Number);
      return Date.UTC(y, m - 1, day) / 86400000;
    };

    // Sequência atual: dias consecutivos com estudo até hoje
    // (se hoje ainda não tem estudo, conta a partir de ontem)
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if ((studyMap.get(toKey(cursor)) || 0) === 0) cursor.setDate(cursor.getDate() - 1);
    let current = 0;
    while ((studyMap.get(toKey(cursor)) || 0) > 0) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Recorde: maior sequência de dias consecutivos com estudo
    // byDate: para cada dia com estudo, há quantos dias estava sem falhar até ele
    const studiedDays = [...studyMap.keys()]
      .filter(k => (studyMap.get(k) || 0) > 0)
      .sort();
    const byDate: Record<string, number> = {};
    let record = 0;
    let run = 0;
    let prev = -Infinity;
    for (const iso of studiedDays) {
      const dayNum = toDayNum(iso);
      run = dayNum === prev + 1 ? run + 1 : 1;
      record = Math.max(record, run);
      byDate[iso] = run;
      prev = dayNum;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowNum = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
    const lastStudiedNum = Math.max(
      ...studiedDays.map(toDayNum)
    );
    const daysOff = Math.max(0, nowNum - lastStudiedNum);

    return { current, record, daysOff, byDate };
  }, [records, missaoAtiva]);

  const formatDateLabel = (dateStr: string) => {
    const [, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const formatFullDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-20"
    >
      {/* BANNER DE MISSÃO NÃO SELECIONADA */}
      {(missaoAtiva === 'Escolha a sua missão' || !missaoAtiva) && (
        <motion.div variants={itemVariants}>
          <MissionBanner />
        </motion.div>
      )}

      {/* FILTROS DE PERÍODO E DADOS DETECTADOS */}
      <motion.div variants={itemVariants}>
        <AnalysisToolbar
          filterPeriod={filterPeriod}
          setFilterPeriod={setFilterPeriod}
          setIsReleaseNotesOpen={setIsReleaseNotesOpen}
          records={records}
          activeRecords={activeRecords}
          missaoAtiva={missaoAtiva}
          showGlobalStats={showGlobalStats}
          setShowGlobalStats={setShowGlobalStats}
        />
      </motion.div>

      {/* ROW 1: KPIs */}
      <motion.div variants={itemVariants}>
        <KPIRow
          precision={precision}
          totalHours={totalHours}
          totalQuestions={totalQuestions}
          daysUntilExam={daysUntilExam}
        />
      </motion.div>

      {/* ROW 2: MAPA DE CONSTÂNCIA */}
      <motion.div variants={itemVariants}>
        <ConsistencyHeatmap
          data={heatmapData}
          summaryDate={summaryDate}
          currentStreak={streakStats.current}
          recordStreak={streakStats.record}
          daysOff={streakStats.daysOff}
          streakByDate={streakStats.byDate}
          onDateSelect={setSummaryDate}
        />
      </motion.div>

      {/* ROW 3: PRINCIPAL */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <KnowledgeCurveChart
          data={evolutionData}
          formatDateLabel={formatDateLabel}
          formatFullDate={formatFullDate}
        />
        <DailySummaryPanel
          summaryDate={summaryDate}
          summaryData={summaryStatsByMateria}
          summaryMinutes={summaryMinutes}
          summaryQuestions={summaryQuestions}
          onDateChange={setSummaryDate}
        />
      </motion.div>

      {/* ROW 4: PAINEL + ÚLTIMAS ATIVIDADES */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <SubjectPanel subjects={subjectStats} simulados={simuladoStats} />
        <RecentActivities records={activeRecords} />
      </motion.div>

      <ReleaseNotesModal isOpen={isReleaseNotesOpen} onClose={() => setIsReleaseNotesOpen(false)} />
    </motion.div>
  );
};

export default HomeView;
