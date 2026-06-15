import { X, AlertTriangle, Database, Copy } from 'lucide-react';

interface SqlScriptModalProps {
  show: boolean;
  permissionError: boolean;
  sqlScript: string;
  onClose: () => void;
  onCopy: () => void;
}

const SqlScriptModal = ({ show, permissionError, sqlScript, onClose, onCopy }: SqlScriptModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-700 w-full max-w-3xl rounded-2xl p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
        <div className="flex items-center gap-3 mb-4 text-cyan-400">
          {permissionError ? <AlertTriangle size={32} className="text-red-500" /> : <Database size={32} />}
          <h3 className="text-xl font-bold">{permissionError ? 'Banco de Dados Desatualizado' : 'Script de Correção do Banco'}</h3>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Para que o sistema funcione corretamente, o banco precisa estar atualizado. O script abaixo cria a coluna de peso e corrige duplicatas.<br /><br />
          <strong className="text-white">COPIE O CÓDIGO ABAIXO E EXECUTE NO SUPABASE (SQL EDITOR):</strong>
        </p>
        <div className="relative bg-slate-900 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-[11px] font-mono">
            <pre className="whitespace-pre-wrap">{sqlScript}</pre>
          </div>
          <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end">
            <button onClick={onCopy} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Copy size={14} /> Copiar SQL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SqlScriptModal;
