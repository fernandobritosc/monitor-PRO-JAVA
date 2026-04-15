import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import { supabase } from '../services/supabase';
import {
  Trophy,
  TrendingUp,
  Clock,
  Target,
  CalendarDays,
  Trash2,
  PlusCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useEditais } from '../hooks/queries/useEditais';

const renderHTML = (html: string) => (
  <span
    className="[&_a:hover:text-cyan-300 [&_a]:text-cyan-400 [&_a]:underline [&_br]:block [&_em]:italic [&_p]:my-1 [&_strong]:text-slate-200 [&_u]:underline"
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

// Helper para exibição de data local
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '--/--/----';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const SimuladoSubjectRow: React.FC<{
  record: StudyRecord;
  onUpdate: (record: StudyRecord) => void;
  peso: number;
}> = ({ record, onUpdate, peso }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localAcertos, setLocalAcertos] = useState(record.acertos);
  const [localTotal, setLocalTotal] = useState(record.total);

  const handleSave = () => {
    if (localTotal > 0 && localAcertos <= localTotal) {
      const updatedRecord = {
        ...record,
        acertos: localAcertos,
        total: localTotal,
        taxa: (localAcertos / localTotal) * 100,
      };
      onUpdate(updatedRecord);
      setIsEditing(false);
    } else {
      alert('Erro: O número de acertos não pode ser maior que o total.');
    }
  };

  const isInvalid = localTotal > 0 && localAcertos > localTotal;

  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/30 p-2 transition-colors hover:bg-white/5">
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="truncate text-sm font-bold text-slate-300">
              {record.materia}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                className="rounded bg-green-500/20 p-1.5 text-green-400 hover:bg-green-500/40"
              >
                <Save size={14} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/40"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-center text-[9px] font-bold uppercase text-slate-500">
                Acertos
              </label>
              <input
                type="number"
                className={`w-full border bg-slate-950/30 ${isInvalid ? 'border-red-500 text-red-400' : 'border-white/10 text-green-400'} rounded px-2 py-1.5 text-center font-bold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                value={localAcertos}
                onChange={(e) => setLocalAcertos(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-center text-[9px] font-bold uppercase text-slate-500">
                Total
              </label>
              <input
                type="number"
                className="w-full rounded border border-white/10 bg-slate-950/30 px-2 py-1.5 text-center font-bold text-white [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={localTotal}
                onChange={(e) => setLocalTotal(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
              <BookOpen size={14} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-300">
                {record.materia}{' '}
                <span className="ml-1 rounded bg-slate-800 px-1 text-[9px] font-bold text-slate-500">
                  x{peso}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-xs font-bold text-white">
                  {record.acertos}/{record.total}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${record.taxa >= 80 ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}
                >
                  {record.taxa.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-600 transition-colors hover:text-cyan-400"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const Simulados: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const missaoAtiva = useAppStore((s) => s.missaoAtiva);
  const {
    studyRecords: records,
    updateRecord: onRecordUpdate,
    deleteManyRecords: onGroupDelete,
  } = useStudyRecords(userId);
  const { editais } = useEditais(userId);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const navigate = useNavigate();

  // 1. Filtrar registros do tipo Simulado
  const activeSimuladoRecords = useMemo(() => {
    return records
      .filter((r) => r.concurso === missaoAtiva && r.tipo === 'Simulado')
      .sort(
        (a, b) =>
          new Date(b.data_estudo).getTime() - new Date(a.data_estudo).getTime(),
      );
  }, [records, missaoAtiva]);

  // 2. Agrupar por (Data + Assunto)
  const groupedSimulados = useMemo(() => {
    const groups: Record<string, StudyRecord[]> = {};
    const editaisMap = new Map<string, EditalMateria>(
      editais
        .filter((e) => e.concurso === missaoAtiva)
        .map((e) => [e.materia, e]),
    );

    activeSimuladoRecords.forEach((r) => {
      // Chave única composta
      const key = `${r.data_estudo}::${r.assunto}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    // Converter para array e calcular stats agregados
    return Object.entries(groups)
      .map(([key, groupRecords]) => {
        const [date, assunto] = key.split('::');

        const totalAcertos = groupRecords.reduce(
          (acc, r) => acc + r.acertos,
          0,
        );
        const totalQuestoes = groupRecords.reduce((acc, r) => acc + r.total, 0);
        const totalTempo = groupRecords.reduce((acc, r) => acc + r.tempo, 0);
        const taxaGlobal =
          totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;

        // Cálculo Ponderado
        let weightedScore = 0;
        let weightedMax = 0;

        groupRecords.forEach((r) => {
          const editalItem = editaisMap.get(r.materia);
          const peso = editalItem?.peso || 1;
          weightedScore += r.acertos * peso;
          weightedMax += r.total * peso;
        });

        // Se for um registro único "Geral", usamos os comentários dele, senão concatena ou pega do primeiro
        const comentarios = groupRecords[0]?.comentarios;

        return {
          id: key, // ID virtual do grupo
          date,
          assunto,
          records: groupRecords, // Lista detalhada
          acertos: totalAcertos,
          total: totalQuestoes,
          taxa: taxaGlobal,
          tempo: totalTempo,
          comentarios,
          weightedScore,
          weightedMax,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeSimuladoRecords, editais, missaoAtiva]);

  // Stats Gerais (Média, Melhor, etc)
  const stats = useMemo(() => {
    if (groupedSimulados.length === 0)
      return { avg: 0, best: 0, total: 0, totalTime: 0 };

    const total = groupedSimulados.length;
    const avg = groupedSimulados.reduce((acc, g) => acc + g.taxa, 0) / total;
    const best = Math.max(...groupedSimulados.map((g) => g.taxa));
    const totalTime = groupedSimulados.reduce((acc, g) => acc + g.tempo, 0);

    return { avg, best, total, totalTime };
  }, [groupedSimulados]);

  // Chart Data
  const chartData = useMemo(() => {
    return [...groupedSimulados]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((g) => ({
        date: formatDateDisplay(g.date).substring(0, 5), // DD/MM
        taxa: g.taxa,
        assunto: g.assunto,
      }));
  }, [groupedSimulados]);

  // Actions
  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const deleteGroup = async (group: (typeof groupedSimulados)[0]) => {
    if (
      !confirm(
        `Excluir o simulado "${group.assunto}" e todos os seus registros detalhados?`,
      )
    )
      return;

    const idsToDelete = group.records.map((r) => r.id);
    onGroupDelete(idsToDelete);
  };

  return (
    <div className="space-y-8 pb-20 duration-500 animate-in fade-in slide-in-from-bottom-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h3 className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-3xl font-bold text-transparent">
            Arena de Simulados
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Histórico de provas completas e performance global na missão{' '}
            <span className="font-bold text-white">{missaoAtiva}</span>.
          </p>
        </div>
        <button
          onClick={() => navigate('/registrar-simulado')}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 px-6 py-3 font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-1 hover:from-purple-500 hover:to-cyan-500"
        >
          <PlusCircle size={20} />
          Novo Simulado
        </button>
      </div>

      {groupedSimulados.length === 0 ? (
        <div className="glass space-y-6 rounded-2xl border border-white/5 p-12 text-center md:p-20">
          <div className="mx-auto flex h-32 w-32 animate-pulse items-center justify-center rounded-full bg-yellow-500/10 text-6xl shadow-[0_0_50px_rgba(234,179,8,0.2)]">
            🏆
          </div>
          <div className="mx-auto max-w-md">
            <h4 className="mb-3 text-2xl font-bold text-white">
              Sua primeira prova te espera
            </h4>
            <p className="leading-relaxed text-slate-400">
              Simulados são essenciais para testar sua resistência e gestão de
              tempo. Registre seu primeiro resultado para desbloquear as
              métricas de evolução.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="glass rounded-xl border-b-4 border-yellow-500 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-500">
                <Trophy size={14} /> Melhor Nota
              </div>
              <div className="text-3xl font-black text-white">
                {stats.best.toFixed(1)}%
              </div>
            </div>

            <div className="glass rounded-xl border-b-4 border-cyan-500 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400">
                <TrendingUp size={14} /> Média Geral
              </div>
              <div className="text-3xl font-black text-white">
                {stats.avg.toFixed(1)}%
              </div>
            </div>

            <div className="glass rounded-xl border-b-4 border-purple-500 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400">
                <Target size={14} /> Realizados
              </div>
              <div className="text-3xl font-black text-white">
                {stats.total}
              </div>
            </div>

            <div className="glass rounded-xl border-b-4 border-green-500 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
                <Clock size={14} /> Tempo Total
              </div>
              <div className="text-3xl font-black text-white">
                {Math.floor(stats.totalTime / 60)}h
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="glass rounded-2xl p-6">
            <h4 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="text-slate-400" size={20} />
              Curva de Evolução
            </h4>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTaxa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#ffffff05"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={10}
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12151D',
                      border: '1px solid #ffffff10',
                      borderRadius: '12px',
                    }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)}%`,
                      'Nota',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="taxa"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTaxa)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="text-slate-400" size={20} />
              Histórico Detalhado
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {groupedSimulados.map((group) => {
                const isExpanded = expandedGroups[group.id];
                const colorClass =
                  group.taxa >= 80
                    ? 'border-green-500'
                    : group.taxa >= 60
                      ? 'border-yellow-500'
                      : 'border-red-500';

                return (
                  <div
                    key={group.id}
                    className={`glass overflow-hidden rounded-xl border-l-2 ${colorClass}`}
                  >
                    {/* Card Header (Click to Expand) */}
                    <div
                      className="flex cursor-pointer flex-col items-start justify-between gap-6 p-5 transition-all hover:bg-white/[0.02] md:flex-row md:items-center"
                      onClick={() => toggleExpand(group.id)}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {formatDateDisplay(group.date)}
                          </div>
                          <div className="rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-500">
                            Simulado
                          </div>
                        </div>
                        <h4 className="flex items-center gap-2 text-xl font-bold text-white">
                          {group.assunto}
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-slate-500" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-500" />
                          )}
                        </h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-500" />
                            {Math.floor(group.tempo / 60)}h{group.tempo % 60}m
                          </span>
                          {group.comentarios && (
                            <div
                              className="max-w-[200px] text-xs font-medium text-slate-400 md:max-w-md"
                              title="Clique para expandir"
                            >
                              {renderHTML(group.comentarios)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full items-center justify-between gap-8 md:w-auto md:justify-end">
                        {group.weightedMax > 0 &&
                        group.weightedMax !== group.total ? (
                          <div className="text-center">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              Pontos (Peso)
                            </div>
                            <div className="text-xl font-bold text-cyan-400">
                              {group.weightedScore.toFixed(1)}
                              <span className="text-sm text-slate-600">
                                /{group.weightedMax}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              Acertos
                            </div>
                            <div className="text-xl font-bold text-slate-300">
                              {group.acertos}
                              <span className="text-sm text-slate-600">
                                /{group.total}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="min-w-[80px] text-center">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Nota
                          </div>
                          <div
                            className={`text-3xl font-black ${group.taxa >= 80 ? 'text-green-400' : group.taxa >= 60 ? 'text-yellow-400' : 'text-red-400'}`}
                          >
                            {group.taxa.toFixed(1)}%
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGroup(group);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/50 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                          title="Excluir Simulado Completo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-slate-900/30 p-4 animate-in slide-in-from-top-2">
                        <div className="mb-4 flex items-center justify-between px-2">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Detalhamento por Matéria
                          </h5>
                          <div className="rounded bg-slate-800 px-3 py-1 text-xs font-bold uppercase text-slate-500">
                            {group.acertos}/{group.total} Total
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {group.records.map((record) => {
                            const editalItem = editais.find(
                              (e) =>
                                e.concurso === missaoAtiva &&
                                e.materia === record.materia,
                            );
                            const peso = editalItem?.peso || 1;
                            return (
                              <SimuladoSubjectRow
                                key={record.id}
                                record={record}
                                onUpdate={onRecordUpdate}
                                peso={peso}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Simulados;
