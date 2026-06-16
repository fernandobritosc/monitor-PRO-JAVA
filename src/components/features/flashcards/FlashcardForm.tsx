import React from 'react';
import { Plus, Edit2, X, CheckCircle2, Lock, ChevronDown, ChevronUp, Save, RotateCcw } from 'lucide-react';
import { CustomSelector } from '../../CustomSelector';
import { EditalMateria } from '../../../types';

interface FlashcardFormData {
  front: string;
  back: string;
  materia: string;
  assunto: string;
}

interface FlashcardFormProps {
  newCard: FlashcardFormData;
  setNewCard: React.Dispatch<React.SetStateAction<FlashcardFormData>>;
  editingId: string | null;
  saveOrUpdateCard: () => void;
  cancelEdit: () => void;
  editais: EditalMateria[];
  missaoAtiva: string;
  showTopicsDropdown: boolean;
  setShowTopicsDropdown: (val: boolean) => void;
  saveMessage: string | null;
  materias: string[];
  availableTopics: string[];
  clearForm?: () => void;
}

export const FlashcardForm: React.FC<FlashcardFormProps> = ({
  newCard, setNewCard, editingId, saveOrUpdateCard, cancelEdit,
  saveMessage, materias, availableTopics, clearForm,
  showTopicsDropdown, setShowTopicsDropdown,
}) => {
  return (
    <div className="glass-premium bg-[hsl(var(--bg-user-block))/0.4] border border-[hsl(var(--border))] rounded-[2rem] p-10 shadow-inner relative">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
        {editingId ? <Edit2 size={120} /> : <Plus size={120} />}
      </div>

      <div className="flex justify-between items-center mb-10 relative z-10">
        <h4 className="text-lg font-black text-[hsl(var(--text-bright))] uppercase tracking-widest flex items-center gap-4">
          {editingId ? (
            <><div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 border border-yellow-500/20"><Edit2 size={20} /></div> Calibrar Célula Neural</>
          ) : (
            <><div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-lg text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)]"><Plus size={20} /></div> Injetar Novo Conhecimento</>
          )}
        </h4>
        {editingId && (
          <button onClick={cancelEdit} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-white bg-red-500/10 px-5 py-2.5 rounded-xl border border-red-500/20 transition-all hover:bg-red-500 active:scale-95">
            <X size={14} className="inline mr-2" /> Abortar Edição
          </button>
        )}
      </div>

      {saveMessage && (
        <div className="mb-8 p-5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs font-black uppercase tracking-[0.15em] flex items-center gap-4 animate-in slide-in-from-top-4">
          <CheckCircle2 size={20} /> {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 relative z-30">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Matéria</label>
          <CustomSelector
            label="Matéria"
            value={newCard.materia}
            options={materias.filter((m) => m !== 'Todas' && m !== 'Todos')}
            onChange={(val) => setNewCard({ ...newCard, materia: val })}
            placeholder="Selecione a disciplina..."
          />
        </div>

        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex justify-between items-center">
            Assunto Específico
            {!editingId && newCard.assunto && <span className="text-[9px] text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5 animate-pulse"><Lock size={10} /> Parâmetro Fixado</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={newCard.assunto}
              onChange={(e) => setNewCard({ ...newCard, assunto: e.target.value })}
              onClick={() => { if (availableTopics.length > 0) setShowTopicsDropdown(true); }}
              className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 text-sm text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none transition-all placeholder-[hsl(var(--text-muted)/0.5)]"
              placeholder="Ex: Teoria Geral do Estado, Atos de Improbidade..."
            />
            {availableTopics.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 text-[hsl(var(--text-muted))] hover:text-white rounded-lg transition-colors"
              >
                {showTopicsDropdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
            {showTopicsDropdown && availableTopics.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[#1a1d26] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 backdrop-blur-3xl">
                <div
                  onClick={() => { setNewCard((prev) => ({ ...prev, assunto: '' })); setShowTopicsDropdown(false); }}
                  className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all"
                >
                  Limpar Seleção
                </div>
                {availableTopics.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setNewCard((prev) => ({ ...prev, assunto: t }));
                      setShowTopicsDropdown(false);
                    }}
                    className={`px-6 py-4 text-xs font-bold transition-all border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex items-center gap-3 ${newCard.assunto === t ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-slate-300'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${newCard.assunto === t ? 'bg-[hsl(var(--accent))] animate-pulse' : 'bg-slate-700'}`} />
                    <span className="flex-1 leading-relaxed truncate">{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Símbolo de Pergunta (Frente)</label>
          <input type="text" value={newCard.front} onChange={(e) => setNewCard({ ...newCard, front: e.target.value })} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-5 text-base text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner" placeholder="Qual o conceito fundamental de...?" />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Arquitetura de Resposta (Verso)</label>
          <textarea value={newCard.back} onChange={(e) => setNewCard({ ...newCard, back: e.target.value })} className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-5 text-base text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] outline-none min-h-[160px] transition-all placeholder-[hsl(var(--text-muted)/0.3)] shadow-inner resize-none" placeholder="A resposta detalhada ou conceito chave..." />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 mt-12 relative z-10">
        <button onClick={saveOrUpdateCard} className={`flex-1 px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 text-white transition-all shadow-xl active:scale-95 ${editingId ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/20' : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:to-indigo-500 shadow-cyan-500/20'}`}>
          {editingId ? <RotateCcw size={20} /> : <Save size={20} />}
          {editingId ? 'Sincronizar Alterações' : 'Consolidar no Arsenal'}
        </button>
        {!editingId && (newCard.materia || newCard.assunto || newCard.front || newCard.back) && (
          <button onClick={clearForm} className="px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 text-red-500 hover:text-white transition-all bg-red-500/5 hover:bg-red-500 border border-red-500/20 shadow-lg active:scale-95" title="Resetar todos os campos">
            <RotateCcw size={20} /> Limpar Forçado
          </button>
        )}
      </div>
    </div>
  );
};
