import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudyRecord, ErrorAnalysis, EditalMateria } from '../../../types';
import {
  NOVA_CATEGORIA,
  isCustomCategoria,
  loadCustomCategorias,
  mergeCategorias,
  saveCustomCategorias,
} from '../../../utils/categorias';
import { CustomSelector } from '../../CustomSelector';
import {
  Edit, X, Clock, BookOpen, List, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Calculator, Zap, Target
} from 'lucide-react';

interface HistoryEditModalProps {
  editingRecord: StudyRecord | null;
  materiasDisponiveis: string[];
  editais: EditalMateria[];
  missaoAtiva: string;
  onSave: (record: StudyRecord) => void;
  onClose: () => void;
}

const minutesToHHMM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const HistoryEditModal: React.FC<HistoryEditModalProps> = ({
  editingRecord,
  materiasDisponiveis,
  editais,
  missaoAtiva,
  onSave,
  onClose,
}) => {
  const [editForm, setEditForm] = useState<{
    materia: string; assunto: string; data_estudo: string; tempoHHMM: string;
    acertos: number | string; total: number | string; comentarios: string;
    material: string; categoria: string; categoriaNova: string;
    meta: string; tipo: string; analise_erros: ErrorAnalysis[];
    gabarito: string; minha_resposta: string;
  }>({
    materia: '', assunto: '', data_estudo: '', tempoHHMM: '',
    acertos: '', total: '', comentarios: '', material: '', categoria: 'Teoria',
    categoriaNova: '', meta: '', tipo: '',
    analise_erros: [], gabarito: '', minha_resposta: '',
  });
  const [customs, setCustoms] = useState<string[]>([]);

  const splitMetaLines = (text: string): { material: string; categoria: string; rest: string } => {
    let rest = text;
    let material = '';
    let categoria = '';
    const matMatch = rest.match(/^Material:\s*(.+)$/mi);
    if (matMatch) {
      material = matMatch[1].trim();
      rest = rest.replace(matMatch[0], '');
    }
    const catMatch = rest.match(/^Categoria:\s*(.+)$/mi);
    if (catMatch) {
      categoria = catMatch[1].trim();
      rest = rest.replace(catMatch[0], '');
    }
    return { material, categoria, rest: rest.replace(/^\n+/, '') };
  };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingRecord) {
      const { material, categoria, rest } = splitMetaLines(editingRecord.comentarios || '');
      const loadedCustoms = loadCustomCategorias(editingRecord.user_id);
      const allKnown = mergeCategorias(loadedCustoms);
      const effectiveCustoms = categoria && isCustomCategoria(categoria) && !allKnown.some((c) => c.toLowerCase() === categoria.toLowerCase())
        ? [...loadedCustoms, categoria]
        : loadedCustoms;
      if (effectiveCustoms.length !== loadedCustoms.length) {
        saveCustomCategorias(editingRecord.user_id, effectiveCustoms);
      }
      setCustoms(effectiveCustoms);
      setEditForm({
        materia: editingRecord.materia,
        assunto: editingRecord.assunto,
        data_estudo: editingRecord.data_estudo,
        tempoHHMM: minutesToHHMM(editingRecord.tempo),
        acertos: editingRecord.acertos,
        total: editingRecord.total,
        comentarios: rest,
        material,
        categoria: categoria || 'Teoria',
        categoriaNova: '',
        meta: String(editingRecord.meta || ''),
        tipo: editingRecord.tipo || '',
        analise_erros: editingRecord.analise_erros || [],
        gabarito: editingRecord.gabarito || '',
        minha_resposta: editingRecord.minha_resposta || '',
      });
    }
  }, [editingRecord]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTopicsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSimuladoEdit = editingRecord?.tipo === 'Simulado';
  const numericAcertos = Number(editForm.acertos) || 0;
  const numericTotal = Number(editForm.total) || 0;
  const percentage = numericTotal > 0 ? (numericAcertos / numericTotal) * 100 : 0;

  const topicosDisponiveis = useMemo(() => {
    if (!editForm.materia) return [];
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === editForm.materia);
    return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
  }, [editais, missaoAtiva, editForm.materia]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) value = `${value.slice(0, 2)}:${value.slice(2)}`;
    setEditForm({ ...editForm, tempoHHMM: value });
  };

  const validateTimeInput = (val: string): number => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return 0;
    let hours = 0, minutes = 0;
    if (cleaned.length <= 2) minutes = parseInt(cleaned);
    else if (cleaned.length === 3) { hours = parseInt(cleaned.substring(0, 1)); minutes = parseInt(cleaned.substring(1)); }
    else { hours = parseInt(cleaned.substring(0, 2)); minutes = parseInt(cleaned.substring(2)); }
    return hours * 60 + minutes;
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    const acertos = Number(editForm.acertos);
    const total = Number(editForm.total);
    if (acertos > total) { setMsg({ type: 'error', text: 'Erro: Acertos > Total.' }); return; }
    const isNova = editForm.categoria === NOVA_CATEGORIA;
    const categoriaFinal = isNova ? editForm.categoriaNova.trim() : editForm.categoria;
    if (isNova && !categoriaFinal) { setMsg({ type: 'error', text: 'Erro: Informe o nome da nova categoria.' }); return; }
    if (isNova && isCustomCategoria(categoriaFinal)) {
      const known = mergeCategorias(customs);
      if (!known.some((c) => c.toLowerCase() === categoriaFinal.toLowerCase())) {
        const updated = [...customs, categoriaFinal];
        setCustoms(updated);
        saveCustomCategorias(editingRecord.user_id, updated);
      }
    }
    setLoading(true);
    setMsg(null);
    const tempo = validateTimeInput(editForm.tempoHHMM);
    const taxa = total > 0 ? (acertos / total) * 100 : 0;
    const restComentarios = editForm.comentarios.trim();
    const linhas: string[] = [];
    if (editForm.material.trim()) linhas.push(`Material: ${editForm.material.trim()}`);
    linhas.push(`Categoria: ${categoriaFinal}`);
    if (restComentarios) linhas.push(restComentarios);
    const comentarios = linhas.join('\n');
    const updatedRecord: StudyRecord = {
      ...editingRecord,
      materia: editForm.materia, assunto: editForm.assunto, data_estudo: editForm.data_estudo,
      acertos, total, taxa, tempo,
      comentarios, meta: (editForm.meta as string).trim() || null,
      tipo: editForm.tipo || null, gabarito: editForm.gabarito,
      minha_resposta: editForm.minha_resposta,
      analise_erros: editForm.analise_erros.length > 0 ? editForm.analise_erros : undefined,
    };
    onSave(updatedRecord);
    setLoading(false);
  };

  if (!editingRecord) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass custom-scrollbar relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 p-6 animate-in zoom-in-95">
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-500 hover:text-white"><X size={24} /></button>
        <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold"><Edit className="text-cyan-400" />Editar {isSimuladoEdit ? 'Simulado' : 'Registro'}</h3>

        {msg && (
          <div className={`mb-6 rounded-xl border p-4 text-sm font-bold ${msg.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="ml-2 uppercase tracking-widest">{msg.text}</span>
          </div>
        )}

        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><Clock size={12} /> Data & Tempo</label>
              <div className="flex gap-2">
                <input type="date" className="flex-1 rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.data_estudo} onChange={e => setEditForm({ ...editForm, data_estudo: e.target.value })} />
                <input type="text" placeholder="HH:MM" maxLength={5} className="w-24 rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-center font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.tempoHHMM} onChange={handleTimeChange} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><BookOpen size={12} /> Matéria</label>
              <CustomSelector label="Matéria" value={editForm.materia}
                options={isSimuladoEdit ? ['Geral', ...materiasDisponiveis] : materiasDisponiveis}
                onChange={val => setEditForm({ ...editForm, materia: val, assunto: '' })} placeholder="Selecione a disciplina..." />
            </div>
          </div>

          <div className="space-y-2" ref={dropdownRef}>
            <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><List size={12} /> Assunto / Tópico</label>
            <div className="relative">
              <input type="text" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 pr-10 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                value={editForm.assunto} onChange={e => setEditForm({ ...editForm, assunto: e.target.value })}
                onClick={() => { if (!isSimuladoEdit && topicosDisponiveis.length > 0) setShowTopicsDropdown(true); }}
                placeholder={!isSimuladoEdit && editForm.materia ? 'Selecione ou digite o tópico...' : 'Preencha o campo'} />
              {!isSimuladoEdit && topicosDisponiveis.length > 0 && (
                <button type="button" onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-colors hover:text-white">
                  {showTopicsDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
              {showTopicsDropdown && !isSimuladoEdit && topicosDisponiveis.length > 0 && (
                <div className="custom-scrollbar absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1d26] shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-2">
                  <div onClick={() => { setEditForm({ ...editForm, assunto: '' }); setShowTopicsDropdown(false); }}
                    className="cursor-pointer border-b border-white/5 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-white/5">
                    Limpar Seleção
                  </div>
                  {topicosDisponiveis.map(t => (
                    <div key={t} onClick={() => { setEditForm({ ...editForm, assunto: t }); setShowTopicsDropdown(false); }}
                      className={`cursor-pointer px-6 py-4 text-xs font-bold transition-all hover:bg-white/5 ${editForm.assunto === t ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-300'}`}>
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!isSimuladoEdit && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><BookOpen size={12} /> Material</label>
                <input type="text" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.material} onChange={e => setEditForm({ ...editForm, material: e.target.value })} placeholder="Ex.: Aula 01" />
              </div>
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><Target size={12} /> Meta</label>
                <input type="text" inputMode="numeric" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.meta} onChange={e => setEditForm({ ...editForm, meta: e.target.value.replace(/\D/g, '') })} placeholder="Nº da meta" />
              </div>
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><List size={12} /> Categoria</label>
                <select className="w-full cursor-pointer rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })}>
                  {mergeCategorias(customs).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {editForm.categoria === NOVA_CATEGORIA && (
                  <input type="text" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    value={editForm.categoriaNova} onChange={e => setEditForm({ ...editForm, categoriaNova: e.target.value })} placeholder="Nome da nova categoria" />
                )}
              </div>
            </div>
          )}

          {isSimuladoEdit && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><Target size={12} /> Meta</label>
                <input type="text" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.meta} onChange={e => setEditForm({ ...editForm, meta: e.target.value })} placeholder="Ex: 1º Fase" />
              </div>
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><Zap size={12} /> Tipo</label>
                <input type="text" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })} disabled />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">Acertos</label>
              <input type="number" min="0" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-bold text-green-400 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                value={editForm.acertos} onChange={e => setEditForm({ ...editForm, acertos: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">Total</label>
              <input type="number" min="0" className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                value={editForm.total} onChange={e => setEditForm({ ...editForm, total: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">Taxa</label>
              <div className={`rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-center text-4xl font-black ${percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {percentage.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">Anotações / Observações</label>
            <textarea className="h-24 w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-sm text-slate-300 placeholder-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Pontos chave, dúvidas ou links..." value={editForm.comentarios}
              onChange={e => setEditForm({ ...editForm, comentarios: e.target.value })} />
          </div>

          <button onClick={handleSaveEdit} disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 py-4 font-extrabold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50">
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div> : <><Calculator size={20} /> SALVAR ALTERAÇÕES</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryEditModal;
