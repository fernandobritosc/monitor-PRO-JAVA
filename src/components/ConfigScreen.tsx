
import React, { useState } from 'react';
import { saveAppConfig, resetAppConfig } from '../services/supabase';
import { Settings, AlertTriangle, CheckCircle2, Loader2, Sparkles, Zap } from 'lucide-react';
import { logger } from '../utils/logger';

interface ConfigScreenProps {
  initialError?: string | null;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({ initialError }) => {
  const [aiKey, setAiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(initialError || null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestStatus('testing');
    setLoading(true);

    const trimmedAiKey = aiKey.trim();
    const trimmedGroqKey = groqKey.trim();

    try {
      setTestStatus('success');
      // O backend é fixo; salva apenas as chaves de IA e recarrega
      setTimeout(() => {
        saveAppConfig('', '', trimmedAiKey, trimmedGroqKey);
      }, 800);
    } catch (err: unknown) {
      logger.error('UI', "Falha ao salvar configuração:", err);
      setError(err instanceof Error ? err.message : 'Falha ao salvar configuração.');
      setTestStatus('error');
      setLoading(false);
    }
  };

  const isErrorRecovery = !!initialError || !!error;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0E1117] flex items-center justify-center p-6 relative overflow-hidden font-['Montserrat']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-10">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl ${isErrorRecovery || testStatus === 'error' ? 'from-red-500 to-orange-500 shadow-red-500/20' : 'from-purple-500 to-cyan-500 shadow-purple-500/20'}`}>
            {testStatus === 'testing' ? (
               <Loader2 className="animate-spin text-white" size={40} />
            ) : testStatus === 'success' ? (
               <CheckCircle2 className="text-white animate-in zoom-in" size={40} />
            ) : isErrorRecovery ? (
               <AlertTriangle className="text-white" size={40} />
            ) : (
               <Settings className="text-white" size={40} />
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${isErrorRecovery || testStatus === 'error' ? 'from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400' : 'from-purple-600 to-cyan-600 dark:from-purple-400 dark:to-cyan-400'}`}>
              {testStatus === 'success' ? 'Sucesso!' : isErrorRecovery ? 'Verifique a Conexão' : 'Configurar Acesso'}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">
            {testStatus === 'success' ? 'Salvando no navegador...' : 'Conecte seu banco de dados'}
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-3xl p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-white/5 relative">
          
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-300 text-xs p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={24} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}
          
          <div className="pt-4 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-500 dark:text-yellow-400" /> Google Gemini API Key
                </label>
                <input
                type="password"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono text-xs"
                placeholder="AIza..."
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                disabled={loading}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Zap size={12} className="text-orange-500 dark:text-orange-400" /> Groq API Key
                </label>
                <input
                type="password"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono text-xs"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                disabled={loading}
                />
            </div>
            <p className="text-[10px] text-slate-500 px-1">Chaves de IA são opcionais, mas recomendadas para explicações automáticas.</p>
          </div>
          
          <div className="text-xs text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-white/5">
             <p>Seus dados ficarão salvos no servidor seguro do Monitor Pro.</p>
           <p className="mt-1">Configuração do banco de dados já está definida pelo aplicativo.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 mt-4 flex justify-center items-center gap-2
              ${testStatus === 'success' 
                ? 'bg-green-500 text-white shadow-green-500/20' 
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-purple-500/20'
              }`}
          >
            {loading ? (
              <>
                 <Loader2 size={20} className="animate-spin" />
                 {testStatus === 'testing' ? 'Testando...' : 'Salvando...'}
              </>
            ) : testStatus === 'success' ? (
              <>
                 <CheckCircle2 size={20} />
                 Salvo com Sucesso!
              </>
            ) : (
              'Salvar Conexão'
            )}
          </button>
        </form>

        <div className="text-center mt-8">
            <button onClick={resetAppConfig} className="text-xs text-slate-500 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors font-bold uppercase tracking-widest">
                Limpar Dados e Reiniciar
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigScreen;
