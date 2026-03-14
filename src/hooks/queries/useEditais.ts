import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { editaisQueries } from '../../services/queries/editais';
import { EditalMateria } from '../../types';

export const useEditais = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['editais', userId],
    queryFn: () => editaisQueries.getByUser(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const upsertMutation = useMutation({
    mutationFn: (records: Partial<EditalMateria>[]) => editaisQueries.upsert(records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editais', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => editaisQueries.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editais', userId] });
    },
  });

  return {
    ...query,
    editais: query.data || [],
    upsertEditais: upsertMutation.mutateAsync,
    deleteEditais: deleteMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
