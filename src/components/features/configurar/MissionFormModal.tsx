import { PlusCircle, X, Terminal, Briefcase, Calendar, BookOpen, Edit, Trash2, Calculator, Save, Loader2 } from 'lucide-react';

interface SubjectDraft {
  id?: string;
  materia: string;
  topicos: string[];
  peso: number;
}

interface MissionFormModalProps {
  isOpen: boolean;
  editingOldName: string | null;
  formConcurso: string;
  formCargo: string;
  formDataProva: string;
  formSubjects: SubjectDraft[];
  newSubjectName: string;
  newSubjectTopics: string;
  newSubjectWeight: number;
  editingSubjectIndex: number | null;
  loading: boolean;
  onClose: () => void;
  onFormConcursoChange: (v: string) => void;
  onFormCargoChange: (v: string) => void;
  onFormDataProvaChange: (v: string) => void;
  onNewSubjectNameChange: (v: string) => void;
  onNewSubjectTopicsChange: (v: string) => void;
  onNewSubjectWeightChange: (v: number) => void;
  onAddSubject: () => void;
  onEditSubject: (index: number) => void;
  onCancelSubjectEdit: () => void;
  onRemoveSubject: (index: number) => void;
  onSubmit: () => void;
}

const MissionFormModal = ({
  isOpen, editingOldName,
  formConcurso, formCargo, formDataProva, formSubjects,
  newSubjectName, newSubjectTopics, newSubjectWeight, editingSubjectIndex,
  loading,
  onClose,
  onFormConcursoChange, onFormCargoChange, onFormDataProvaChange,
  onNewSubjectNameChange, onNewSubjectTopicsChange, onNewSubjectWeightChange,
  onAddSubject, onEditSubject, onCancelSubjectEdit, onRemoveSubject,
  onSubmit,
}: MissionFormModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-4xl rounded-2xl p-8 relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3"><PlusCircle className="text-cyan-400" /> {editingOldName ? `Editar Edital: ${editingOldName}` : 'Criar Novo Edital'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Terminal size={12} /> Concurso</label><input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formConcurso} onChange={e => onFormConcursoChange(e.target.value)} placeholder="Ex: TJSP Escrevente" required /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase size={12} /> Cargo</label><input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formCargo} onChange={e => onFormCargoChange(e.target.value)} placeholder="Ex: Escrevente Técnico Judiciário" required /></div>
          </div>
          <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={12} /> Data da Prova (Opcional)</label><input type="date" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formDataProva} onChange={e => onFormDataProvaChange(e.target.value)} /></div>
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-lg font-bold flex items-center gap-2 text-white"><BookOpen size={20} /> Matérias do Edital</h4>
            <div className="space-y-2">{formSubjects.map((sub, index) => (<div key={index} className="flex items-center gap-3 bg-slate-950/30 p-3 rounded-lg border border-white/5"><span className="flex-1 text-sm font-medium text-slate-300">{sub.materia} <span className="text-slate-500 text-xs ml-2">({sub.topicos.length} tópicos)</span><span className="text-xs font-bold bg-slate-800 text-yellow-400 px-2 py-0.5 rounded ml-2">Peso {sub.peso}</span></span><div className="flex gap-2"><button type="button" onClick={() => onEditSubject(index)} className="p-2 text-slate-500 hover:text-cyan-400"><Edit size={16} /></button><button type="button" onClick={() => onRemoveSubject(index)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div></div>))}</div>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4"><div className="flex-1 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Matéria</label><input type="text" className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium" value={newSubjectName} onChange={e => onNewSubjectNameChange(e.target.value)} placeholder="Ex: Língua Portuguesa" /></div><div className="w-24 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calculator size={10} /> Peso</label><input type="number" min="0.1" step="0.1" className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium text-center" value={newSubjectWeight} onChange={e => onNewSubjectWeightChange(Number(e.target.value))} /></div></div>
              <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tópicos (separar por ; ou quebra de linha)</label><textarea className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium h-24" value={newSubjectTopics} onChange={e => onNewSubjectTopicsChange(e.target.value)} placeholder="Ex: Sintaxe; Crase; Pontuação; Interpretação de Texto"></textarea></div>
              <div className="flex gap-2 justify-end">{editingSubjectIndex !== null && (<button type="button" onClick={onCancelSubjectEdit} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl flex items-center gap-2"><X size={16} /> Cancelar</button>)}<button type="button" onClick={onAddSubject} className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 px-6 font-bold">{editingSubjectIndex !== null ? <><Save size={16} /> Salvar Matéria</> : <><PlusCircle size={16} /> Adicionar Matéria</>}</button></div>
            </div>
          </div>
          <div className="flex gap-4 pt-4 border-t border-white/5"><button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-4 rounded-xl transition-all border border-white/5">CANCELAR</button><button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Edital</>}</button></div>
        </form>
      </div>
    </div>
  );
};

export default MissionFormModal;
