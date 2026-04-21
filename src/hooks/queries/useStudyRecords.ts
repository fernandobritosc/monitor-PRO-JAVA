import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyRecordsQueries } from '../../services/queries/studyRecords';
import { StudyRecord } from '../../types';
import { db, OfflineAttempt } from '../../services/offline/db';
import { syncService } from '../../services/offline/sync';
import { supabase } from '../../lib/supabase';

export const useStudyRecords = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['studyRecords', userId];

  // Escuta ativa em Tempo Real via Supabase WebSockets (Resolve o delay Multi-Dispositivo)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registros_estudos',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, queryKey.join('-')]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      
      // 0. Recuperar registros "orfãos" (sem user_id) salvos por erro
      try {
        const allLocal = await db.studyRecords.toArray();
        const orphans = allLocal.filter(r => !r.user_id || r.user_id === 'undefined');
        if (orphans.length > 0) {
          console.warn(`🔍 Recuperando ${orphans.length} registros sem usuário para ${userId}`);
          await db.studyRecords.bulkPut(orphans.map(o => ({ 
            ...o, 
            user_id: userId,
            syncStatus: 'pending' // Força sincronização desses recuperados
          })));
        }
      } catch (err) {
        console.error('Erro na auto-recuperação:', err);
      }

      const localData = await db.studyRecords
        .where('user_id')
        .equals(userId)
        .toArray();

      // 2. Tentar buscar do remoto
      try {
        if (navigator.onLine) {
          const remoteData = await studyRecordsQueries.getByUser(userId);
          const remoteCount = remoteData?.length || 0;
          
          console.log(`[SYNC] ☁️ Supabase: ${remoteCount} registros | Dexie: ${localData.length} registros`);
          
          if (remoteData && remoteCount > 0) {
            const remoteIds = new Set(remoteData.map((r: StudyRecord) => r.id));
            
            // Merge: atualiza cache local com dados da nuvem
            const remoteToStore: OfflineAttempt[] = remoteData.map((r: StudyRecord) => ({
              ...r,
              syncStatus: 'synced' as const,
              lastModified: (r as any).lastModified || Date.now()
            }));
            await db.studyRecords.bulkPut(remoteToStore);

            // PROTEÇÃO: registros locais que NÃO existem na nuvem
            // Em vez de DELETAR (perda de dados), marca como 'pending' para re-sync
            const orphans = localData.filter(
              (l: OfflineAttempt) => l.syncStatus === 'synced' && !remoteIds.has(l.id)
            );
            
            if (orphans.length > 0) {
              console.warn(`[SYNC] ⚠️ ${orphans.length} registros locais não encontrados na nuvem. Marcando para re-sync...`);
              await db.studyRecords.bulkPut(
                orphans.map((o: OfflineAttempt) => ({ ...o, syncStatus: 'pending' as const }))
              );
            }
          } else if (remoteCount === 0 && localData.length > 0) {
            // Nuvem vazia mas temos dados locais → marca tudo como pending para upload
            const syncedLocals = localData.filter((d: OfflineAttempt) => d.syncStatus === 'synced');
            if (syncedLocals.length > 0) {
              console.warn(`[SYNC] 🚨 Nuvem vazia! Marcando ${syncedLocals.length} registros locais para re-upload...`);
              await db.studyRecords.bulkPut(
                syncedLocals.map((o: OfflineAttempt) => ({ ...o, syncStatus: 'pending' as const }))
              );
            }
          }
          
          // Dispara sync de pendentes em background (não bloqueia a UI)
          syncService.syncPendingAttempts().catch(() => {});
        }
        
        return await db.studyRecords.where('user_id').equals(userId).toArray();
      } catch (error) {
        console.error('[SYNC] ❌ Erro ao sincronizar:', error);
        return localData;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos refresca
  });

  const insertMutation = useMutation({
    mutationFn: async (records: Partial<StudyRecord> | Partial<StudyRecord>[]) => {
      const recordsArray = Array.isArray(records) ? records : [records];
      
      // SEMPRE inserimos no Dexie primeiro
      const recordsToInsert = recordsArray.map((r: Partial<StudyRecord>) => ({
        ...r,
        id: r.id || crypto.randomUUID(),
        user_id: userId,
        syncStatus: 'pending',
        lastModified: Date.now()
      })) as OfflineAttempt[];

      await db.studyRecords.bulkAdd(recordsToInsert);

      // Tentar enviar para o Supabase se houver rede
      if (navigator.onLine) {
        try {
          const insertedData = await studyRecordsQueries.insert(recordsToInsert as StudyRecord[]);
          // Supabase RLS silenciosamente retorna array vazio se bloquear a inserção
          if (insertedData && insertedData.length === recordsToInsert.length) {
            await db.studyRecords.bulkPut(recordsToInsert.map((r: OfflineAttempt) => ({ ...r, syncStatus: 'synced' })));
          } else {
            console.warn('⚠️ Supabase não retornou os dados. Bloqueio por RLS provável. Mantendo como pending.');
            await db.studyRecords.bulkPut(recordsToInsert.map((r: OfflineAttempt) => ({ ...r, syncStatus: 'pending' })));
          }
        } catch (e) {
          console.warn('⚠️ Falha no sync imediato, ficará pendente:', e);
        }
      }
      return recordsToInsert; // Retorna os registros locais para a UI
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (record: StudyRecord) => {
      const offlineRecord: OfflineAttempt = {
        ...record,
        syncStatus: 'pending',
        lastModified: Date.now()
      };
      
      // Atualiza no Dexie primeiro
      await db.studyRecords.put(offlineRecord);

      // Tenta sincronizar com o Supabase
      if (navigator.onLine) {
        try {
          await studyRecordsQueries.update(record);
          // Se deu certo, atualiza o status no Dexie para 'synced'
          await db.studyRecords.put({ ...offlineRecord, syncStatus: 'synced' });
        } catch (e: any) {
          // Se for erro de rede (offline), apenas avisamos e deixamos pendente no Dexie
          if (!navigator.onLine || e.message === 'Failed to fetch') {
            console.warn('⚠️ Update offline, marcado como pendente no Dexie');
          } else {
            // Se for erro de banco (400, RLS, etc), logamos e podemos propagar ou tratar
            console.error('❌ Falha na sincronização remota (não é offline):', e);
            throw e; // Propaga para o ErrorAnalysisView detectar a falha
          }
        }
      }
      return offlineRecord;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Deleta do Dexie primeiro
      await db.studyRecords.delete(id);
      
      // Tenta sincronizar com o Supabase
      if (navigator.onLine) {
        try {
          await studyRecordsQueries.delete(id);
        } catch (e) {
          console.error('❌ Erro ao deletar no remoto:', e);
          // Opcional: registrar deleção pendente se o Supabase exigir
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Deleta do Dexie primeiro
      await db.studyRecords.bulkDelete(ids);
      
      // Tenta sincronizar com o Supabase
      if (navigator.onLine) {
        try {
          await studyRecordsQueries.deleteMany(ids);
        } catch (e) {
          console.error('❌ Erro ao deletar múltiplos no remoto:', e);
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    studyRecords: (query.data || []) as StudyRecord[],
    insertRecord: insertMutation.mutateAsync,
    updateRecord: updateMutation.mutateAsync,
    deleteRecord: deleteMutation.mutateAsync,
    deleteManyRecords: deleteManyMutation.mutateAsync,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending || deleteManyMutation.isPending,
  };
};
