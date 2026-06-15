import { GabaritoItem } from '../../../types';
import { CustomSelector } from '../../CustomSelector';
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';
import {
  Brain, Sparkles, AlertTriangle, CheckSquare, X, FileText,
  ChevronUp, ChevronDown, CheckCircle2
} from 'lucide-react';

interface GabaritoQuestionCardProps {
  question: GabaritoItem;
  userAnswer: string | undefined;
  officialAnswer: string | undefined;
  isExpanded: boolean;
  onUserAnswerChange: (questionNumber: number, answer: string) => void;
  onOfficialAnswerChange: (questionNumber: number, answer: string) => void;
  onToggleExpand: (questionNumber: number) => void;
}

const GabaritoQuestionCard = ({
  question,
  userAnswer,
  officialAnswer,
  isExpanded,
  onUserAnswerChange,
  onOfficialAnswerChange,
  onToggleExpand,
}: GabaritoQuestionCardProps) => {
  const isCorrectVsOfficial = userAnswer && officialAnswer && userAnswer === officialAnswer;
  const isMatchWithIA = userAnswer && question.alternativa_correta_ia && userAnswer === question.alternativa_correta_ia;

  return (
    <div className={`glass-premium bg-[hsl(var(--bg-card))] rounded-[2.5rem] p-8 border-2 transition-all duration-500 relative overflow-hidden group ${userAnswer && officialAnswer ? (isCorrectVsOfficial ? 'border-emerald-500/30' : 'border-red-500/30') : 'border-[hsl(var(--border))]'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${userAnswer && officialAnswer ? (isCorrectVsOfficial ? 'bg-emerald-500' : 'bg-red-500') : 'bg-transparent'}`} />

      <div className="flex flex-col xl:flex-row gap-10">
        <div className="xl:w-48 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Brain size={20} className="text-indigo-400" />
            </div>
            <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Item {question.numero_questao}</h4>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 rounded-[1.5rem] border border-purple-500/20 shadow-lg shadow-purple-500/5">
              <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2 block">Gabarito IA (Sugestão)</p>
              <div className="text-3xl font-black text-white">{question.alternativa_correta_ia}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Sua Resposta
              </h5>
              <div className="flex gap-2">
                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => onUserAnswerChange(question.numero_questao, opt)}
                    className={`w-12 h-12 rounded-2xl text-xs font-black transition-all transform hover:scale-110 active:scale-90 border-2 ${userAnswer === opt ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-[hsl(var(--bg-user-block))] border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-indigo-500/50'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Gabarito Oficial (Banca)
              </h5>
              <div className="relative group">
                <CustomSelector
                  label="Gabarito"
                  value={officialAnswer || ''}
                  options={['A', 'B', 'C', 'D', 'E']}
                  onChange={val => onOfficialAnswerChange(question.numero_questao, val)}
                  placeholder="Não divulgado"
                  icon={<CheckCircle2 size={16} />}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isMatchWithIA ? 'text-indigo-400' : 'text-[hsl(var(--text-muted))]'}`}>
                {isMatchWithIA ? <><Sparkles size={12} /> Bate com a IA</> : <><AlertTriangle size={12} /> Diverge da IA</>}
              </div>
              {officialAnswer && (
                <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isCorrectVsOfficial ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isCorrectVsOfficial ? <><CheckSquare size={12} /> Acerto Real</> : <><X size={12} /> Erro Real</>}
                </div>
              )}
            </div>
            <button
              onClick={() => onToggleExpand(question.numero_questao)}
              className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors group/btn"
            >
              <FileText size={16} className="group-hover/btn:scale-110 transition-transform" />
              {isExpanded ? 'Ocultar Detalhes' : 'Ver Auditoria Completa'}
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-10 pt-10 border-t border-[hsl(var(--border))] animate-in fade-in slide-in-from-top-4 duration-500 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                <div className="w-1 h-3 bg-indigo-500 rounded-full" /> Enunciado Capturado
              </h5>
              <div className="bg-[hsl(var(--bg-main)/0.5)] p-6 rounded-[1.5rem] border border-[hsl(var(--border))] text-xs leading-relaxed text-[hsl(var(--text-muted))] font-medium">
                {question.enunciado}
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-3">
                <div className="w-1 h-3 bg-purple-500 rounded-full" /> Justificativa Neural
              </h5>
              <div className="bg-[hsl(var(--bg-main)/0.5)] p-6 rounded-[1.5rem] border border-[hsl(var(--border))] text-sm leading-relaxed text-indigo-100/80 whitespace-pre-wrap">
                <MarkdownRenderer content={question.justificativa} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GabaritoQuestionCard;
