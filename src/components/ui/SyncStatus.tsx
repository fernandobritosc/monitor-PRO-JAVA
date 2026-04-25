import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/offline/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncService } from '../../services/offline/sync';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { studyRecordsQueries } from '../../services/queries/studyRecords';

export const SyncStatus: React.FC = () => {
  const { userId } = useSession();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const localTotal = useLiveQuery(() => db.studyRecords.count(), [], 0);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);

  useEffect(() => {
    if (isOnline && userId) {
      studyRecordsQueries.getCount(userId)
        .then(setRemoteTotal)
        .catch(console.error);
    }
  }, [isOnline, userId, isSyncing]);

  const hasDivergence = remoteTotal !== null && localTotal !== remoteTotal;

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

  const handleEmergencyRescue = async () => {
    if (confirm('🚨 MODO RESGATE DE EMERGÊNCIA 🚨\n\nIsso forçará todos os registros locais salvos no navegador a se marcarem como pendentes e serem re-enviados para a nuvem.\n\nDeseja realizar o resgate agora?')) {
      setIsSyncing(true);
      try {
        const recordsToRescue = await db.studyRecords.where('syncStatus').equals('synced').toArray();
        if (recordsToRescue.length > 0) {
          await db.studyRecords.bulkPut(recordsToRescue.map(r => ({ ...r, syncStatus: 'pending' })));
          await syncService.syncPendingAttempts();
          alert(`Resgate acionado! ${recordsToRescue.length} registros foram reenviados para a fila de sincronização.`);
        } else {
          alert('Nenhum registro local encontrado para resgate.');
        }
      } catch (err) {
        console.error('Erro no resgate:', err);
      } finally {
        setTimeout(() => setIsSyncing(false), 2000);
      }
    }
  };

  const handleForceRefresh = async () => {
    if (confirm('🌪️ SINCRONIZAÇÃO TOTAL (NUVEM -> LOCAL) 🌪️\n\nIsso vai apagar os dados do seu navegador e baixar tudo o que está no Supabase do zero. Recomendado se os dados locais não batem com o Vercel.\n\nDeseja continuar?')) {
      setIsSyncing(true);
      try {
        const result = await syncService.safeRefresh(userId || '');
        alert(result.message);
      } catch (err) {
        console.error('Erro no refresh:', err);
        alert('Falha ao sincronizar dados.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const supabaseUrl = (supabase as any).supabaseUrl || '';
  const dbHost = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : 'Desconhecido';

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
              <span className="text-[8px] font-bold text-red-400/50 uppercase tracking-tighter">DB: {dbHost}</span>
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
              <span className="text-[8px] font-bold text-[hsl(var(--accent)/0.5)] uppercase tracking-tighter">DB: {dbHost}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="synced"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onDoubleClick={handleEmergencyRescue}
            onClick={(e) => e.shiftKey && handleForceRefresh()}
            className={`flex items-center gap-3 px-4 py-2.5 border backdrop-blur-xl rounded-2xl shadow-2xl group cursor-help transition-all ${
              hasDivergence 
                ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
            }`}
            title={`ID: ${userId?.slice(0, 8) || 'Desconhecido'}\nDB: ${dbHost}\nTotal Local: ${localTotal}\nTotal Nuvem: ${remoteTotal || '...'}\n\n${
              hasDivergence ? '⚠️ DIVERGÊNCIA DETECTADA: Os totais não batem.\n' : ''
            }Dê um duplo clique para RESGATE (PC -> Nuvem)\nSegure SHIFT + Clique para REFRESH (Nuvem -> PC)`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${
              hasDivergence ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-green-500/20 group-hover:bg-green-500/30'
            }`}>
              <Cloud size={16} className={hasDivergence ? 'text-amber-400' : 'text-green-400'} />
            </div>
            <div className="flex flex-col text-left">
              <span className={`text-[10px] font-black uppercase tracking-widest ${hasDivergence ? 'text-amber-400' : 'text-green-400'}`}>
                {hasDivergence ? 'Divergência' : 'Sincronizado'}
              </span>
              <span className={`text-[8px] font-bold uppercase tracking-tighter ${hasDivergence ? 'text-amber-400/70' : 'text-green-400/50'}`}>
                {hasDivergence ? 'Ajuste Necessário' : `DB: ${dbHost}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};