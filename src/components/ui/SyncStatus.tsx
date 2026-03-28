import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/offline/db';
import { useLiveQuery } from 'dexie-react-hooks';

export const SyncStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Corrigido: .filter() não exige índice no schema do Dexie
  // .where('is_synced') exigia que o campo fosse indexado → SchemaError
  const pendingCount = useLiveQuery(
    async () => {
      try {
        return await db.studyRecords
          .where('syncStatus')
          .equals('pending')
          .count();
      } catch (e) {
        console.error('Dexie syncStatus query error:', e);
        return 0;
      }
    },
    [],
    0 // valor padrão enquanto carrega
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (pendingCount && pendingCount > 0 && isOnline) {
      setIsSyncing(true);
      const timer = setTimeout(() => setIsSyncing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingCount, isOnline]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {!isOnline ? (
          <motion.div
            key="offline"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-2xl shadow-2xl"
          >
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <CloudOff size={16} className="text-red-400" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Modo Offline</span>
              {pendingCount != null && pendingCount > 0 && (
                <span className="text-[9px] font-bold text-red-400/70 uppercase tracking-tighter">
                  {pendingCount} alterações locais
                </span>
              )}
            </div>
          </motion.div>
        ) : isSyncing ? (
          <motion.div
            key="syncing"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)] backdrop-blur-xl rounded-2xl shadow-2xl"
          >
            <div className="p-1.5 bg-[hsl(var(--accent)/0.2)] rounded-lg">
              <RefreshCw size={16} className="text-[hsl(var(--accent))] animate-spin" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-widest">Sincronizando</span>
              <span className="text-[9px] font-bold text-[hsl(var(--accent)/0.7)] uppercase tracking-tighter">
                Enviando dados para nuvem...
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="synced"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-green-500/10 border border-green-500/20 backdrop-blur-xl rounded-2xl shadow-2xl group cursor-help"
          >
            <div className="p-1.5 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
              <Cloud size={16} className="text-green-400" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Dados Sincronizados</span>
              <span className="text-[9px] font-bold text-green-400/70 uppercase tracking-tighter">
                Monitoramento PRO Ativo
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};