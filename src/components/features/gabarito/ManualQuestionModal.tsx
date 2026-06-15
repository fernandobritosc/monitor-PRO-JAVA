import { Loader2, Sparkles, AlertTriangle, X } from 'lucide-react';

interface ManualQuestionData {
  numero: string;
  enunciado: string;
  alternativas: string;
}

interface ManualQuestionModalProps {
  show: boolean;
  loading: boolean;
  error: string | null;
  questionData: ManualQuestionData;
  onQuestionDataChange: (data: ManualQuestionData) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const ManualQuestionModal = ({
  show,
  loading,
  error,
  questionData,
  onQuestionDataChange,
  onClose,
  onSubmit,
}: ManualQuestionModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-2xl rounded-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X /></button>
        <h3 className="text-xl font-bold mb-6">Adicionar Questão Manualmente</h3>
        {error && <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold flex items-center gap-2"><AlertTriangle size={14} />{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Número da Questão</label>
            <input
              type="number"
              value={questionData.numero}
              onChange={e => onQuestionDataChange({ ...questionData, numero: e.target.value })}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Enunciado Completo</label>
            <textarea
              value={questionData.enunciado}
              onChange={e => onQuestionDataChange({ ...questionData, enunciado: e.target.value })}
              className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-4 mt-1 text-white custom-scrollbar"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Alternativas (uma por linha)</label>
            <textarea
              value={questionData.alternativas}
              onChange={e => onQuestionDataChange({ ...questionData, alternativas: e.target.value })}
              className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-4 mt-1 text-white custom-scrollbar"
              placeholder="A) ...&#10;B) ..."
            />
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold text-sm">Cancelar</button>
            <button onClick={onSubmit} disabled={loading} className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {loading ? 'Analisando...' : 'Analisar e Adicionar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualQuestionModal;
