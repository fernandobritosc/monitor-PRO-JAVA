import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { editaisQueries } from '../../services/queries/editais';
import { EditalMateria } from '../../types';
import { db, OfflineEdital } from '../../services/offline/db';
import { logger } from '../../utils/logger';

export const useEditais = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['editais', userId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];

      const localData = await db.editais
        .where('user_id')
        .equals(userId)
        .toArray();

      if (navigator.onLine) {
        try {
          const remoteData = await editaisQueries.getByUser(userId);
          const remoteCount = remoteData?.length || 0;

          if (remoteData && remoteCount > 0) {
            const pendingIds = new Set(
              localData.filter(d => d.syncStatus === 'pending').map(d => d.id)
            );

            const remoteToStore: OfflineEdital[] = remoteData.map(r => ({
              ...r,
              syncStatus: pendingIds.has(r.id) ? 'pending' : 'synced' as const,
              lastModified: Date.now()
            }));

            await db.editais.bulkPut(remoteToStore);
          }

          return await db.editais.where('user_id').equals(userId).toArray();
        } catch (err) {
          logger.error('SYNC', '[SYNC] Erro ao sincronizar editais:', err);
          return localData;
        }
      }

      return localData;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
  });

  const upsertMutation = useMutation({
    mutationFn: async (records: Partial<EditalMateria>[]) => {
      const recordsToInsert = records.map(r => ({
        ...r,
        id: r.id || crypto.randomUUID(),
        user_id: userId,
        syncStatus: 'pending' as const,
        lastModified: Date.now()
      })) as OfflineEdital[];

      await db.editais.bulkAdd(recordsToInsert);

      if (navigator.onLine) {
        try {
          const result = await editaisQueries.upsert(recordsToInsert);
          if (result && result.length >= recordsToInsert.length) {
            await db.editais.bulkPut(recordsToInsert.map(r => ({
              ...r,
              syncStatus: 'synced' as const,
              lastModified: Date.now()
            })));
          } else {
            await db.editais.bulkPut(recordsToInsert.map(r => ({ ...r, syncStatus: 'pending' as const })));
          }
        } catch (e) {
          logger.warn('SYNC', '⚠️ Falha no sync imediato de editais, ficará pendente:', e);
        }
      }

      return recordsToInsert;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await db.editais.bulkDelete(ids);

      if (navigator.onLine) {
        try {
          await editaisQueries.deleteMany(ids);
        } catch (e) {
          logger.error('SYNC', '❌ Erro ao deletar editais no remoto:', e);
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addTopicoMutation = useMutation({
    mutationFn: async ({ concurso, materia, topico }: { concurso: string; materia: string; topico: string }) => {
      if (!userId) throw new Error('Usuário não autenticado');

      const editais = await db.editais
        .where({ user_id: userId, concurso, materia })
        .toArray();

      const edital = editais[0];

      if (!edital) throw new Error('Matéria não encontrada');

      const currentTopicos = edital.topicos || [];
      const normalizedNew = topico.trim();

      if (currentTopicos.includes(normalizedNew)) return false;

      const updatedTopicos = [...currentTopicos, normalizedNew];

      await db.editais.update(edital.id, {
        topicos: updatedTopicos,
        syncStatus: 'pending',
        lastModified: Date.now()
      });

      if (navigator.onLine) {
        try {
          await editaisQueries.addTopicoToMateria(userId, concurso, materia, topico);
          await db.editais.update(edital.id, { syncStatus: 'synced' });
        } catch (e) {
          logger.warn('SYNC', '⚠️ Falha no sync imediato do tópico, ficará pendente:', e);
        }
      }

      return true;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    editais: query.data || [],
    upsertEditais: upsertMutation.mutateAsync,
    deleteEditais: deleteMutation.mutateAsync,
    addTopicoToMateria: addTopicoMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingTopico: addTopicoMutation.isPending,
  };
};
