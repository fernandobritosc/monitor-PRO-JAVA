import React, { useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useEditais } from '../hooks/queries/useEditais';
import EvolutionChart, { EvolutionPoint } from '../components/features/estatisticas/EvolutionChart';
import StudyHoursChart, { StudyHoursPoint } from '../components/features/estatisticas/StudyHoursChart';
import SubjectHoursChart, { SubjectHoursPoint } from '../components/features/estatisticas/SubjectHoursChart';
import CategoryRadar, { CategoryPoint } from '../components/features/estatisticas/CategoryRadar';
import SubjectPerformanceChart, { SubjectPerformancePoint } from '../components/features/estatisticas/SubjectPerformanceChart';
import TopicPerformanceTable, { TopicPerformanceRow } from '../components/features/estatisticas/TopicPerformanceTable';
import RegisterStudyModal from '../components/features/study/RegisterStudyModal';
import { isSimuladoRecord } from '../utils/categorias';

const formatTotal = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return { h: `${h}h`, m: `${String(m).padStart(2, '0')}min` };
};

const formatAvg = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${String(m).padStart(2, '0')}min`;
};

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const Donut: React.FC<{ pct: number }> = ({ pct }) => {
  const size = 170;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f87171" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={`${filled} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black text-[hsl(var(--text-bright))] tabular-nums">
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
};

const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase">
    {children}
  </h3>
);

const Estatisticas: React.FC = () => {
  const missaoAtiva = useAppStore((s) => s.missaoAtiva);
  const { session } = useAuth();
  const { studyRecords: records = [] } = useStudyRecords(session?.user?.id);
  const { editais = [] } = useEditais(session?.user?.id);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva;
  const scoped = useMemo(
    () => records.filter((r) => (isGlobal ? true : r.concurso === missaoAtiva)),
    [records, isGlobal, missaoAtiva]
  );

  const desempenho = useMemo(() => {
    const total = scoped.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    const correct = scoped.reduce((acc, r) => acc + (Number(r.acertos) || 0), 0);
    return { total, pct: total > 0 ? (correct / total) * 100 : 0 };
  }, [scoped]);

  const tempo = useMemo(() => {
    const totalMin = scoped.reduce((acc, r) => acc + (Number(r.tempo) || 0), 0);
    const dates = [...new Set(scoped.map((r) => String(r.data_estudo).split('T')[0]))].sort();
    const studiedDays = dates.length;
    let totalDays = 0;
    if (dates.length > 0) {
      const [y, m, d] = dates[0].split('-').map(Number);
      const first = Date.UTC(y, m - 1, d);
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      totalDays = Math.max(1, Math.round((today - first) / 86400000) + 1);
    }
    return {
      totalMin,
      studiedDays,
      totalDays,
      avg: studiedDays > 0 ? totalMin / studiedDays : 0,
    };
  }, [scoped]);

  const constancia = useMemo(() => {
    const { studiedDays, totalDays } = tempo;
    const missed = Math.max(0, totalDays - studiedDays);
    return {
      studiedDays,
      missed,
      pct: totalDays > 0 ? (studiedDays / totalDays) * 100 : 0,
    };
  }, [tempo]);

  const edital = useMemo(() => {
    const missionEditais = editais.filter((e) => (isGlobal ? true : e.concurso === missaoAtiva));
    let total = 0;
    let done = 0;
    for (const ed of missionEditais) {
      for (const topico of ed.topicos || []) {
        total++;
        const t = normalize(topico);
        if (!t) continue;
        const ok = scoped.some((r) => {
          if (normalize(r.materia) !== normalize(ed.materia)) return false;
          const a = normalize(r.assunto);
          if (!a) return false;
          return (
            a === t ||
            (a.length > 5 && t.length > 5 && (a.includes(t) || t.includes(a)))
          );
        });
        if (ok) done++;
      }
    }
    return { total, done, pending: total - done, pct: total > 0 ? (done / total) * 100 : 0 };
  }, [editais, scoped, isGlobal, missaoAtiva]);

  const evolution = useMemo<EvolutionPoint[]>(() => {
    const byDay = new Map<string, { correct: number; total: number }>();
    scoped.forEach((r) => {
      const key = String(r.data_estudo).split('T')[0];
      const entry = byDay.get(key) || { correct: 0, total: 0 };
      entry.correct += Number(r.acertos) || 0;
      entry.total += Number(r.total) || 0;
      byDay.set(key, entry);
    });

    const points: EvolutionPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const day = byDay.get(iso);
      const questions = day?.total || 0;
      // Sem questões no dia: sem ponto de desempenho (a linha é interrompida,
      // sem inventar valor nem zerar — não houve avaliação naquele dia)
      const precision = day && day.total > 0 ? (day.correct / day.total) * 100 : null;
      points.push({
        date: iso,
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        questions,
        precision,
      });
    }
    return points;
  }, [scoped]);

  const hoursData = useMemo<StudyHoursPoint[]>(() => {
    const byDay = new Map<string, number>();
    scoped.forEach((r) => {
      const key = String(r.data_estudo).split('T')[0];
      byDay.set(key, (byDay.get(key) || 0) + (Number(r.tempo) || 0));
    });

    const points: StudyHoursPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const minutes = byDay.get(iso) || 0;
      points.push({
        date: iso,
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        hours: Math.round((minutes / 60) * 100) / 100,
        minutes,
      });
    }
    return points;
  }, [scoped]);

  const subjectHours = useMemo<SubjectHoursPoint[]>(() => {
    const bySubject = new Map<string, number>();
    scoped.forEach((r) => {
      bySubject.set(r.materia, (bySubject.get(r.materia) || 0) + (Number(r.tempo) || 0));
    });
    return [...bySubject.entries()]
      .map(([materia, minutes]) => ({
        materia,
        short: materia.length > 24 ? `${materia.slice(0, 24)}…` : materia,
        minutes,
        hours: Math.round((minutes / 60) * 100) / 100,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [scoped]);

  const categories = useMemo<CategoryPoint[]>(() => {
    const totals: Record<string, number> = {
      'Teoria e Questão': 0,
      Teoria: 0,
      Questões: 0,
      Simulados: 0,
      Revisão: 0,
    };
    const parseCategoria = (comentarios?: string): string | null => {
      const match = (comentarios || '').match(/^Categoria:\s*(.+)$/mi);
      const value = match ? match[1].trim() : '';
      return value && Object.hasOwn(totals, value) ? value : null;
    };
    scoped.forEach((r) => {
      const minutes = Number(r.tempo) || 0;
      // 1. Categoria registrada no modal (fonte oficial)
      const saved = parseCategoria(r.comentarios);
      if (saved) {
        totals[saved] += minutes;
        return;
      }
      // 2. Heurística p/ registros antigos sem categoria salva
      const total = Number(r.total) || 0;
      const tipo = r.tipo || 'Estudo';
      if (isSimuladoRecord(r)) totals['Simulados'] += minutes;
      else if (tipo === 'Revisão') totals['Revisão'] += minutes;
      else if (total === 0) totals['Teoria'] += minutes;
      else totals['Questões'] += minutes;
    });
    return (Object.keys(totals) as (keyof typeof totals)[]).map((category) => ({
      category,
      minutes: totals[category],
      label: category,
    }));
  }, [scoped]);

  const performance = useMemo<SubjectPerformancePoint[]>(() => {
    const bySubject = new Map<string, { correct: number; total: number }>();
    scoped.forEach((r) => {
      const entry = bySubject.get(r.materia) || { correct: 0, total: 0 };
      entry.correct += Number(r.acertos) || 0;
      entry.total += Number(r.total) || 0;
      bySubject.set(r.materia, entry);
    });
    return [...bySubject.entries()]
      .map(([materia, s]) => ({
        materia,
        short: materia.length > 22 ? `${materia.slice(0, 22)}…` : materia,
        total: s.total,
        correct: s.correct,
        wrong: s.total - s.correct,
        precision: s.total > 0 ? (s.correct / s.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [scoped]);

  const topics = useMemo<TopicPerformanceRow[]>(() => {
    const byTopic = new Map<string, { materia: string; assunto: string; correct: number; total: number }>();
    scoped.forEach((r) => {
      const key = `${r.materia}|||${r.assunto || 'Geral'}`;
      const entry = byTopic.get(key) || { materia: r.materia, assunto: r.assunto || 'Geral', correct: 0, total: 0 };
      entry.correct += Number(r.acertos) || 0;
      entry.total += Number(r.total) || 0;
      byTopic.set(key, entry);
    });
    return [...byTopic.values()].map((t) => ({
      ...t,
      precision: t.total > 0 ? (t.correct / t.total) * 100 : 0,
    }));
  }, [scoped]);

  const totalFmt = formatTotal(tempo.totalMin);

  return (
    <div className="space-y-6 pb-20 duration-500 animate-in fade-in">
      <div className="flex justify-end">
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-5 py-2.5 flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          <PlusCircle size={15} />
          Registrar estudo
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* DESEMPENHO */}
        <div className="glass-premium rounded-[2rem] p-6 md:p-8">
          <CardTitle>Desempenho</CardTitle>
          <div className="mt-6">
            <Donut pct={desempenho.pct} />
          </div>
          <p className="mt-6 text-center text-xs text-[hsl(var(--text-muted))]">
            {desempenho.total.toLocaleString('pt-BR')} questões resolvidas
          </p>
        </div>

        {/* TEMPO DE ESTUDO */}
        <div className="glass-premium rounded-[2rem] p-6 md:p-8 flex flex-col">
          <CardTitle>Tempo de estudo</CardTitle>
          <div className="mt-4 space-y-1 text-xs text-[hsl(var(--text-main))]">
            <p>{formatAvg(tempo.avg)} por dia estudado (média)</p>
            <p>
              {tempo.studiedDays} {tempo.studiedDays === 1 ? 'dia estudado' : 'dias estudados'}
            </p>
            <p>
              {tempo.totalDays} {tempo.totalDays === 1 ? 'dia total' : 'dias totais'}
            </p>
          </div>
          <p className="mt-auto pt-6 text-right text-3xl font-black text-[hsl(var(--text-bright))] tabular-nums">
            {totalFmt.h}
            <span className="text-lg font-bold">{totalFmt.m}</span>
          </p>
        </div>

        {/* CONSTÂNCIA */}
        <div className="glass-premium rounded-[2rem] p-6 md:p-8 flex flex-col">
          <CardTitle>Constância nos estudos</CardTitle>
          <div className="mt-4 space-y-1 text-xs text-[hsl(var(--text-main))]">
            <p>
              {constancia.studiedDays}{' '}
              {constancia.studiedDays === 1 ? 'dia estudado' : 'dias estudados'}
            </p>
            <p>
              {constancia.missed}{' '}
              {constancia.missed === 1 ? 'dia falhado' : 'dias falhados'}
            </p>
          </div>
          <p className="mt-auto pt-6 text-right text-3xl font-black text-[hsl(var(--text-bright))] tabular-nums">
            {Math.round(constancia.pct)}%
          </p>
        </div>

        {/* PROGRESSO NO EDITAL */}
        <div className="glass-premium rounded-[2rem] p-6 md:p-8 flex flex-col">
          <CardTitle>Progresso no edital</CardTitle>
          <div className="mt-4 space-y-1 text-xs font-bold">
            <p className="text-emerald-600 dark:text-emerald-400">
              {edital.done} {edital.done === 1 ? 'tópico concluído' : 'tópicos concluídos'}
            </p>
            <p className="text-red-500">
              {edital.pending} {edital.pending === 1 ? 'tópico pendente' : 'tópicos pendentes'}
            </p>
          </div>
          <p className="mt-auto pt-6 text-right text-3xl font-black text-[hsl(var(--text-bright))] tabular-nums">
            {Math.round(edital.pct)}%
          </p>
        </div>
      </div>

      <EvolutionChart data={evolution} />

      <StudyHoursChart data={hoursData} />

      <div className="grid grid-cols-1 xl:grid-cols-[7fr_5fr] gap-6">
        <SubjectHoursChart data={subjectHours} />
        <CategoryRadar data={categories} />
      </div>

      <SubjectPerformanceChart data={performance} />

      <TopicPerformanceTable rows={topics} />

      <RegisterStudyModal open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </div>
  );
};

export default Estatisticas;
