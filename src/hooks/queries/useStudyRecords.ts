import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyRecordsQueries } from '../../services/queries/studyRecords';
import { StudyRecord } from '../../types';
import { db, OfflineAttempt } from '../../services/offline/db';

export const useStudyRecords = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['studyRecords', userId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      
      // 1. Buscar dados locais (Dexie)
      const localData = await db.studyRecords
        .where('user_id')
        .equals(userId)
        .toArray();

      // 2. Tentar buscar do remoto
      try {
        if (navigator.onLine) {
          const remoteData = await studyRecordsQueries.getByUser(userId);
          
          // 3. Atualizar o DB local com dados remotos (Merge)
          if (remoteData && remoteData.length > 0) {
            // Mantemos os locais que ainda estão pendentes de sincronização
            const pendingIds = new Set(localData.filter((d: OfflineAttempt) => d.syncStatus === 'pending').map((d: OfflineAttempt) => d.id));
            
            const recordsToStore: OfflineAttempt[] = remoteData.map((r: StudyRecord) => ({
              ...r,
              syncStatus: pendingIds.has(r.id) ? 'pending' : 'synced',
              lastModified: (r as any).lastModified || Date.now() // Ensure lastModified exists
            }));

            await db.studyRecords.bulkPut(recordsToStore);
          }
        }
        
        // Sempre retorna o que está no Dexie (que agora inclui o remoto mesclado)
        // Isso garante que o usuário veja seus dados pendentes IMEDIATAMENTE no dashboard
        return await db.studyRecords.where('user_id').equals(userId).toArray();
      } catch (error) {
        console.error('❌ useStudyRecords: Erro ao sincronizar:', error);
        return localData; // Fallback total para o que temos no Dexie
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
          await studyRecordsQueries.insert(recordsToInsert as StudyRecord[]);
          // Se deu certo, atualizamos o status no Dexie para 'synced'
          await db.studyRecords.bulkPut(recordsToInsert.map((r: OfflineAttempt) => ({ ...r, syncStatus: 'synced' })));
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
        } catch (e) {
          console.warn('⚠️ Update offline, marcado como pendente');
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
