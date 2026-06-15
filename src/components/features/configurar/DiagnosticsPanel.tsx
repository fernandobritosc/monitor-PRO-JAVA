import { Activity, Loader2, HardDriveDownload, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface SyncResult {
  success: boolean;
  message: string;
}

interface DiagnosticsPanelProps {
  diagLog: string[];
  diagLoading: boolean;
  resyncLoading: boolean;
  resyncResult: SyncResult | null;
  onRunDiagnostics: () => void;
  onForceResync: () => void;
  onShowSql: () => void;
}

const DiagnosticsPanel = ({
  diagLog, diagLoading, resyncLoading, resyncResult,
  onRunDiagnostics, onForceResync, onShowSql,
}: DiagnosticsPanelProps) => {
  return (
    <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 space-y-6">
      <div className="flex justify-between items-start">
        <div><h3 className="text-xl font-bold flex items-center gap-2"><Activity className="text-purple-400" /> Central de Diagnóstico</h3><p className="text-slate-400 text-sm mt-1">Use esta ferramenta se você estiver tendo problemas para salvar ou visualizar dados.</p></div>
        <button onClick={onRunDiagnostics} disabled={diagLoading} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 flex items-center gap-2">{diagLoading ? <Loader2 className="animate-spin" size={16} /> : "Executar Teste Completo"}</button>
      </div>
      <div className="bg-black/50 rounded-xl border border-white/10 p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto custom-scrollbar relative">
        {diagLog.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic pointer-events-none">Clique em "Executar Teste Completo" para ver os logs.</div>
        ) : (
          diagLog.map((log, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">{log}</div>)
        )}
      </div>

      <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl shrink-0">
            <HardDriveDownload size={24} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-white text-sm uppercase tracking-widest">Force Re-sync</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Limpa <strong className="text-slate-300">todo o cache local (IndexedDB)</strong> e re-baixa os dados diretamente do Supabase.
              Use quando os números estiverem inflados, duplicados ou divergentes da realidade.
            </p>
          </div>
        </div>
        {resyncResult && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-bottom-2 ${
            resyncResult.success
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {resyncResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {resyncResult.message}
          </div>
        )}
        <button
          onClick={onForceResync}
          disabled={resyncLoading}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black py-4 rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.2em]"
        >
          {resyncLoading ? (
            <><Loader2 className="animate-spin" size={18} /> Limpando cache e re-sincronizando...</>
          ) : (
            <><HardDriveDownload size={18} /> Executar Force Re-sync</>
          )}
        </button>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-4 items-start">
        <AlertTriangle className="text-yellow-500 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-yellow-200 text-sm">Problemas com Permissões?</h4>
          <p className="text-xs text-yellow-200/70 mt-1 mb-3">Se o log mostrar erros "42501" ou "Permission denied", você precisa rodar o script de correção no Supabase.</p>
          <button onClick={onShowSql} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-yellow-500/20">Ver Script de Correção</button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
