import React, { useMemo, useState } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { StudyRecord } from '../../../types';
import { getErrorMessage } from '../../../utils/error';
import { syncService } from '../../../services/offline/sync';
import { editaisQueries } from '../../../services/queries/editais';
import { useSession } from '../../../hooks/useSession';
import { useAppStore } from '../../../stores/useAppStore';
import { useEditais } from '../../../hooks/queries/useEditais';

interface RegisterStudyModalProps {
  open: boolean;
  onClose: () => void;
}

type DateMode = 'hoje' | 'ontem' | 'outro';

const CATEGORIAS = ['Teoria', 'Revisão', 'Questões', 'Teoria e Questão', 'Nova Categoria'];

const getLocalToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterday = () => {
  const dt = new Date();
  dt.setDate(dt.getDate() - 1);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

const parsePartsToMinutes = (h: string, m: string, s: string): number | null => {
  const hours = h === '' ? 0 : Number(h);
  const mins = m === '' ? 0 : Number(m);
  const secs = s === '' ? 0 : Number(s);
  if ([hours, mins, secs].some((n) => Number.isNaN(n) || n < 0)) return null;
  if (mins > 59 || secs > 59) return null;
  return hours * 60 + mins + (secs >= 30 ? 1 : 0);
};

const inputCls =
  'w-full bg-transparent border-0 border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-2 text-sm font-bold text-[hsl(var(--text-bright))] placeholder-[hsl(var(--text-muted)/0.5)]';
const labelCls =
  'text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]';

const RegisterStudyModal: React.FC<RegisterStudyModalProps> = ({ open, onClose }) => {
  const { userId } = useSession();
  const missaoAtiva = useAppStore((s) => s.missaoAtiva);
  const { editais, addTopicoToMateria } = useEditais(userId);
  const queryClient = useQueryClient();

  const [dateMode, setDateMode] = useState<DateMode>('hoje');
  const [customDate, setCustomDate] = useState(getLocalToday());
  const [categoria, setCategoria] = useState('Teoria');
  const [categoriaNova, setCategoriaNova] = useState('');
  const [materia, setMateria] = useState('');
  const [assunto, setAssunto] = useState('');
  const [timeH, setTimeH] = useState('');
  const [timeM, setTimeM] = useState('');
  const [timeS, setTimeS] = useState('');
  const [material, setMaterial] = useState('');
  const [meta, setMeta] = useState('');
  const [acertos, setAcertos] = useState('');
  const [totalQuestoes, setTotalQuestoes] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const materiasDisponiveis = useMemo(() => {
    return editais
      .filter((e) => e.concurso === missaoAtiva)
      .map((e) => e.materia)
      .sort((a, b) => a.localeCompare(b));
  }, [editais, missaoAtiva]);

  const topicosDisponiveis = useMemo(() => {
    if (!materia) return [];
    const edital = editais.find((e) => e.concurso === missaoAtiva && e.materia === materia);
    return edital ? [...(edital.topicos || [])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : [];
  }, [editais, missaoAtiva, materia]);

  if (!open) return null;

  const dataEstudo = dateMode === 'hoje' ? getLocalToday() : dateMode === 'ontem' ? getYesterday() : customDate;

  const resetForm = () => {
    setCategoria('Teoria');
    setCategoriaNova('');
    setMateria('');
    setAssunto('');
    setTimeH('');
    setTimeM('');
    setTimeS('');
    setMaterial('');
    setMeta('');
    setAcertos('');
    setTotalQuestoes('');
    setComentarios('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    setDateMode('hoje');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');

    if (!missaoAtiva || missaoAtiva === 'Escolha a sua missão') {
      setError('Selecione uma missão antes de registrar.');
      return;
    }
    if (!materia.trim()) {
      setError('Informe a disciplina.');
      return;
    }
    if (!assunto || assunto.trim().length < 3) {
      setError('Informe o tópico (mínimo 3 letras).');
      return;
    }
    const minutes = parsePartsToMinutes(timeH, timeM, timeS);
    if (minutes === null || minutes <= 0) {
      setError('Informe um tempo de estudo válido (horas, min e seg).');
      return;
    }
    if (categoria === 'Nova Categoria' && !categoriaNova.trim()) {
      setError('Informe o nome da nova categoria.');
      return;
    }
    const numAcertos = acertos === '' ? 0 : Number(acertos);
    const total = totalQuestoes === '' ? 0 : Number(totalQuestoes);
    if (Number.isNaN(numAcertos) || Number.isNaN(total) || numAcertos < 0 || total < 0) {
      setError('Acertos e total devem ser números válidos.');
      return;
    }
    if (numAcertos > total) {
      setError('Acertos não podem ser maiores que o total.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      const categoriaFinal = categoria === 'Nova Categoria' ? categoriaNova.trim() : categoria;
      const tipo = categoriaFinal === 'Revisão' ? 'Revisão' : 'Estudo';

      // Garante que o tópico fica salvo na lista da matéria
      const materiaExiste = editais.some((e) => e.concurso === missaoAtiva && e.materia === materia.trim());
      if (materiaExiste) {
        try {
          await addTopicoToMateria({ concurso: missaoAtiva, materia: materia.trim(), topico: assunto.trim() });
        } catch {
          // não bloqueia o registro
        }
      } else {
        const missionEdital = editais.find((e) => e.concurso === missaoAtiva);
        await editaisQueries.upsert([{
          user_id: user.id,
          concurso: missaoAtiva,
          cargo: missionEdital?.cargo || missaoAtiva,
          materia: materia.trim(),
          topicos: [assunto.trim()],
          is_principal: false,
          peso: 1,
        }]);
      }

      const linhas: string[] = [];
      if (material.trim()) linhas.push(`Material: ${material.trim()}`);
      if (categoria === 'Nova Categoria') linhas.push(`Categoria: ${categoriaFinal}`);
      if (comentarios.trim()) linhas.push(comentarios.trim());

      const payload: Partial<StudyRecord> = {
        user_id: user.id,
        concurso: missaoAtiva,
        materia: materia.trim(),
        assunto: assunto.trim(),
        data_estudo: dataEstudo,
        acertos: numAcertos,
        total,
        taxa: total > 0 ? (numAcertos / total) * 100 : 0,
        tempo: minutes,
        comentarios: linhas.join('\n'),
        rev_24h: false,
        rev_07d: false,
        rev_15d: false,
        rev_30d: false,
        meta: meta.trim() || null,
        tipo,
      };

      await syncService.saveAttempt(payload);
      await queryClient.invalidateQueries({ queryKey: ['studyRecords', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['editais', user.id] });

      handleClose();
    } catch (err) {
      setError('Erro ao salvar: ' + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const modeBtn = (mode: DateMode, label: string) => (
    <button
      key={mode}
      type="button"
      onClick={() => setDateMode(mode)}
      className={`px-5 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all ${
        dateMode === mode
          ? 'bg-teal-500 text-white shadow'
          : 'bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto custom-scrollbar bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-[hsl(var(--text-bright))] tracking-tight">
            Registro de Estudo
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="p-1 text-teal-500 hover:text-teal-400 transition-colors"
          >
            <X size={26} />
          </button>
        </div>

        {/* DATA */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <CalendarDays size={20} className="text-[hsl(var(--text-bright))]" />
          {modeBtn('hoje', 'HOJE')}
          {modeBtn('ontem', 'ONTEM')}
          {modeBtn('outro', 'OUTRO')}
          {dateMode === 'outro' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-1 text-sm font-bold text-[hsl(var(--text-bright))] bg-transparent"
            />
          )}
          {dateMode !== 'outro' && (
            <span className="text-sm font-bold text-[hsl(var(--text-bright))] tabular-nums">
              {dataEstudo.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {/* CATEGORIA / DISCIPLINA / TEMPO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
          <div className="md:col-span-3">
            <label className={labelCls}>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`${inputCls} cursor-pointer`}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c === 'Teoria' ? 'Selecione...' : c}</option>
              ))}
            </select>
            {categoria === 'Nova Categoria' && (
              <input
                value={categoriaNova}
                onChange={(e) => setCategoriaNova(e.target.value)}
                placeholder="Nome da nova categoria"
                className={`${inputCls} mt-2`}
              />
            )}
          </div>
          <div className="md:col-span-6">
            <label className={labelCls}>Disciplina</label>
            <input
              value={materia}
              onChange={(e) => { setMateria(e.target.value); setAssunto(''); }}
              placeholder="Selecione ou crie uma nova"
              list="register-materias"
              className={inputCls}
            />
            <datalist id="register-materias">
              {materiasDisponiveis.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="md:col-span-3">
            <label className={labelCls}>Tempo de estudo</label>
            <div className="flex items-center gap-1.5">
              <input
                value={timeH}
                onChange={(e) => setTimeH(onlyDigits(e.target.value, 3))}
                placeholder="00"
                inputMode="numeric"
                aria-label="Horas"
                title="Horas"
                className="w-full text-center border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-2 text-sm font-black text-[hsl(var(--text-bright))] bg-transparent tabular-nums placeholder-[hsl(var(--text-muted)/0.5)]"
              />
              <span className="font-black text-[hsl(var(--text-muted))]">:</span>
              <input
                value={timeM}
                onChange={(e) => setTimeM(onlyDigits(e.target.value, 2))}
                placeholder="00"
                inputMode="numeric"
                aria-label="Minutos"
                title="Minutos"
                className="w-full text-center border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-2 text-sm font-black text-[hsl(var(--text-bright))] bg-transparent tabular-nums placeholder-[hsl(var(--text-muted)/0.5)]"
              />
              <span className="font-black text-[hsl(var(--text-muted))]">:</span>
              <input
                value={timeS}
                onChange={(e) => setTimeS(onlyDigits(e.target.value, 2))}
                placeholder="00"
                inputMode="numeric"
                aria-label="Segundos"
                title="Segundos"
                className="w-full text-center border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-2 text-sm font-black text-[hsl(var(--text-bright))] bg-transparent tabular-nums placeholder-[hsl(var(--text-muted)/0.5)]"
              />
            </div>
          </div>
        </div>

        {/* TÓPICO / MATERIAL / META */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
          <div className="md:col-span-5">
            <label className={labelCls}>Tópico</label>
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Selecione ou crie um novo"
              list="register-topicos"
              className={inputCls}
            />
            <datalist id="register-topicos">
              {topicosDisponiveis.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="md:col-span-4">
            <label className={labelCls}>Material</label>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Ex.: Aula 01"
              className={inputCls}
            />
          </div>
          <div className="md:col-span-3">
            <label className={labelCls}>Meta</label>
            <input
              value={meta}
              onChange={(e) => setMeta(e.target.value.replace(/\D/g, ''))}
              placeholder="Nº da meta"
              inputMode="numeric"
              className={inputCls}
            />
          </div>
        </div>

        {/* QUESTÕES */}
        <div className="inline-block rounded-2xl border-2 border-teal-500/30 px-5 py-3 mb-6">
          <p className={labelCls}>Questões</p>
          <p className="text-[9px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest mt-1 mb-2">
            Acertos / Total
          </p>
          <div className="flex items-center gap-4">
            <input
              value={acertos}
              onChange={(e) => setAcertos(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
              className="w-16 text-center border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-1 text-sm font-black text-[hsl(var(--text-bright))] bg-transparent tabular-nums"
            />
            <input
              value={totalQuestoes}
              onChange={(e) => setTotalQuestoes(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
              className="w-16 text-center border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-1 text-sm font-black text-[hsl(var(--text-bright))] bg-transparent tabular-nums"
            />
          </div>
        </div>

        {/* COMENTÁRIOS */}
        <div className="mb-6">
          <label className={labelCls}>Comentários</label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={3}
            className="w-full bg-transparent border-0 border-b-2 border-teal-500/60 focus:border-teal-400 focus:outline-none py-2 text-sm text-[hsl(var(--text-bright))] resize-y"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm font-bold text-red-500">{error}</p>
        )}

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-8 py-2.5 rounded-xl border-2 border-teal-500 text-teal-600 dark:text-teal-400 text-sm font-black uppercase tracking-wider hover:bg-teal-500/10 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-10 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-black uppercase tracking-wider transition-all shadow-lg disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterStudyModal;
