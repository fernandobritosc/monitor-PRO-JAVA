import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyRecordsQueries } from '../../services/queries/studyRecords';
import { StudyRecord } from '../../types';

export const useStudyRecords = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['studyRecords', userId],
    queryFn: () => studyRecordsQueries.getByUser(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const insertMutation = useMutation({
    mutationFn: (records: Partial<StudyRecord> | Partial<StudyRecord>[]) => 
      studyRecordsQueries.insert(records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyRecords', userId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (record: StudyRecord) => studyRecordsQueries.update(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyRecords', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studyRecordsQueries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyRecords', userId] });
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: (ids: string[]) => studyRecordsQueries.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyRecords', userId] });
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
