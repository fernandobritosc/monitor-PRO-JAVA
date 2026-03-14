
import React from 'react';
import { RefreshCw, Database, LogIn } from 'lucide-react';

interface AppStatusIndicatorsProps {
  isLoading: boolean;
  backgroundSyncing: boolean;
  isOfflineMode: boolean;
  isError: boolean;
  session: any;
  appVersion: string;
  onFetchData: () => void;
  onLogout: () => void;
}

const AppStatusIndicators: React.FC<AppStatusIndicatorsProps> = ({
  isLoading,
  backgroundSyncing,
  isOfflineMode,
  isError,
  session,
  appVersion,
  onFetchData,
  onLogout
}) => {
  return (
    <>
      {isLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--accent)] animate-pulse z-[60]" />}
      
      {backgroundSyncing && !isOfflineMode && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-white/5 z-[100] animate-in fade-in">
          <RefreshCw size={10} className="animate-spin" /> v{appVersion}
        </div>
      )}

      {isOfflineMode && !isError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl mb-6 flex items-center justify-between gap-4 text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Database size={16} />
            <span>Modo Offline (v{appVersion}).</span>
            <span className="hidden md:inline font-normal opacity-70">Exibindo dados do cache. Algumas funções podem estar limitadas.</span>
          </div>
          {session ? (
            <button onClick={onFetchData} className="underline hover:text-white flex items-center gap-1">
              <RefreshCw size={12} /> Tentar Conectar
            </button>
          ) : (
            <button onClick={onLogout} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all">
              <LogIn size={12} /> Fazer Login
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default AppStatusIndicators;
