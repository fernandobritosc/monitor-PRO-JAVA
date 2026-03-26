import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyRecordsQueries } from '../../services/queries/studyRecords';
import { StudyRecord } from '../../types';
import { db } from '../../services/offline/db';

export const useStudyRecords = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['studyRecords', userId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // 1. Tentar ler do Dexie primeiro (instantâneo)
      const localData = await db.attempts
        .where('user_id')
        .equals(userId!)
        .toArray();

      // Se houver dados locais, retornamos imediatamente
      // O React Query fará o refetch em background se estiver stale
      if (!userId) {
        console.warn('useStudyRecords: userId is missing, skipping fetch');
        return [];
      }
      
      console.log('🔍 useStudyRecords: Iniciando busca para', userId);
      // 1. Tentar buscar do remoto
      try {
        const remoteData = await studyRecordsQueries.getByUser(userId);
        console.log(`✅ useStudyRecords: Supabase retornou ${remoteData.length} registros`);
        
        // Atualiza o DB local com novos registros remotos
        if (remoteData && remoteData.length > 0) {
          await db.attempts.bulkPut(remoteData.map(r => ({ ...r, syncStatus: 'synced' })));
          console.log('💾 useStudyRecords: Dexie atualizado com dados remotos');
        }

        return remoteData || [];
      } catch (error) {
        console.error('❌ useStudyRecords: Falha ao buscar no Supabase:', error);
        // Fallback para dados locais em caso de erro na rede
        const localData = await db.attempts.where('user_id').equals(userId).toArray();
        console.log(`🏠 useStudyRecords: Fallback para Dexie retornou ${localData.length} registros`);
        return localData;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 minutos (já que temos sync local)
  });

  const insertMutation = useMutation({
    mutationFn: (records: Partial<StudyRecord> | Partial<StudyRecord>[]) => 
      studyRecordsQueries.insert(records),
    onMutate: async (newRecord) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecords = queryClient.getQueryData<StudyRecord[]>(queryKey);
      
      const recordsToAdd = Array.isArray(newRecord) ? newRecord : [newRecord];
      const items = recordsToAdd as StudyRecord[];

      // Atualizar cache local do React Query
      queryClient.setQueryData<StudyRecord[]>(queryKey, (old) => [
        ...items,
        ...(old || []),
      ]);

      // Atualizar Dexie instantaneamente
      await db.attempts.bulkAdd(items.map(r => ({
        ...r,
        syncStatus: 'pending',
        lastModified: Date.now()
      })));

      return { previousRecords };
    },
    onError: (_err, _newRecord, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(queryKey, context.previousRecords);
      }
    },
    onSettled: () => {
      // Opcional: invalidar apenas se houver falha crítica, 
      // mas para performance pesada, evitamos o refetch total se possível.
      // queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (record: StudyRecord) => studyRecordsQueries.update(record),
    onMutate: async (updatedRecord) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecords = queryClient.getQueryData<StudyRecord[]>(queryKey);

      queryClient.setQueryData<StudyRecord[]>(queryKey, (old) =>
        old?.map((r) => (r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r))
      );

      return { previousRecords };
    },
    onError: (_err, _updatedRecord, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(queryKey, context.previousRecords);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studyRecordsQueries.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecords = queryClient.getQueryData<StudyRecord[]>(queryKey);

      queryClient.setQueryData<StudyRecord[]>(queryKey, (old) =>
        old?.filter((r) => r.id !== id)
      );

      return { previousRecords };
    },
    onError: (_err, _id, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(queryKey, context.previousRecords);
      }
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: (ids: string[]) => studyRecordsQueries.deleteMany(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecords = queryClient.getQueryData<StudyRecord[]>(queryKey);

      queryClient.setQueryData<StudyRecord[]>(queryKey, (old) =>
        old?.filter((r) => !ids.includes(r.id))
      );

      return { previousRecords };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(queryKey, context.previousRecords);
      }
    },
  });

  return {
    ...query,
    studyRecords: query.data || [],
    insertRecord: insertMutation.mutateAsync,
    updateRecord: updateMutation.mutateAsync,
    deleteRecord: deleteMutation.mutateAsync,
    deleteManyRecords: deleteManyMutation.mutateAsync,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending || deleteManyMutation.isPending,
  };
};
