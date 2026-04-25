import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyRecordsQueries } from '../../services/queries/studyRecords';
import { StudyRecord } from '../../types';
import { db, OfflineAttempt } from '../../services/offline/db';
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
          console.log(`[SYNC] ☁️ Dados remotos recebidos: ${remoteCount}`);
          
          if (remoteData && remoteCount > 0) {
            const pendingIds = new Set(
              localData.filter((d: OfflineAttempt) => d.syncStatus === 'pending').map((d: OfflineAttempt) => d.id)
            );
            
            const remoteToStore: OfflineAttempt[] = remoteData.map((r: StudyRecord) => ({
              ...r,
              syncStatus: pendingIds.has(r.id) ? 'pending' : 'synced' as const,
              lastModified: (r as any).lastModified || Date.now()
            }));
            
            const result = await db.studyRecords.bulkPut(remoteToStore);
            console.log(`[SYNC] ✅ Cache local (Dexie) atualizado com ${remoteToStore.length} registros.`);
          }
        }
        
        return await db.studyRecords.where('user_id').equals(userId).toArray();
      } catch (error: unknown) {
        console.error('[SYNC] Erro ao sincronizar:', error);
        return localData;
      }
    },
    enabled: !!userId,
    staleTime: 0, // Força verificação sempre que o componente montar
  });

  const insertMutation = useMutation({
    mutationFn: async (records: Partial<StudyRecord> | Partial<StudyRecord>[]) => {
      const recordsArray = Array.isArray(records) ? records : [records];
      
      // SEMPRE inserimos no Dexie primeiro
      const recordsToInsert = recordsArray.map((r: Partial<StudyRecord>, index: number) => {
        const newId = r.id || crypto.randomUUID();
        console.log(`[SYNC] Preparando registro ${index + 1}: ID=${newId} (Tipo: ${typeof newId})`);
        
        return {
          ...r,
          id: String(newId), // Força string para compatibilidade com Dexie e UUIDs
          user_id: userId,
          syncStatus: 'pending',
          lastModified: Date.now()
        };
      }) as OfflineAttempt[];

      await db.studyRecords.bulkAdd(recordsToInsert);

      // Tentar enviar para o Supabase se houver rede
      if (navigator.onLine) {
        try {
          const insertedData = await studyRecordsQueries.upsert(recordsToInsert as StudyRecord[]);
          
          // Validação Rigorosa: Só marca como synced se o Supabase devolveu os registros
          if (insertedData && insertedData.length >= recordsToInsert.length) {
            await db.studyRecords.bulkPut(recordsToInsert.map((r: OfflineAttempt) => ({ 
              ...r, 
              syncStatus: 'synced',
              lastModified: Date.now() 
            })));
            console.log(`[SYNC] ✅ ${recordsToInsert.length} registros confirmados na nuvem.`);
          } else {
            console.error('[SYNC] ❌ Supabase não confirmou todos os registros. Mantendo como pending para retry.');
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
          } catch (e: unknown) {
            // Se for erro de rede (offline), apenas avisamos e deixamos pendente no Dexie
            if (!navigator.onLine || (e as Error).message === 'Failed to fetch') {
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
