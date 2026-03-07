/**
 * Data Access Layer — Registros de Estudos
 * Centraliza todas as queries da tabela `registros_estudos`
 */
import { supabase } from '../supabase';
import { StudyRecord } from '../../types';

export const studyRecordsQueries = {
    /** Busca todos os registros de um usuário (max 2000, desc por data) */
    async getByUser(userId: string) {
        const { data, error } = await supabase
            .from('registros_estudos')
            .select('*')
            .eq('user_id', userId)
            .order('data_estudo', { ascending: false })
            .limit(2000);
        if (error) throw error;
        return data ?? [];
    },

    /** Insere um ou mais registros de estudo */
    async insert(records: Partial<StudyRecord> | Partial<StudyRecord>[]) {
        const payload = Array.isArray(records) ? records : [records];
        const { error } = await supabase.from('registros_estudos').insert(payload);
        if (error) throw error;
    },

    /** Atualiza um registro existente */
    async update(record: StudyRecord) {
        const { error } = await supabase
            .from('registros_estudos')
            .update(record)
            .eq('id', record.id);
        if (error) throw error;
    },

    /** Deleta um registro por ID */
    async delete(id: string) {
        const { error } = await supabase
            .from('registros_estudos')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    /** Deleta múltiplos registros por IDs */
    async deleteMany(ids: string[]) {
        const { error } = await supabase
            .from('registros_estudos')
            .delete()
            .in('id', ids);
        if (error) throw error;
    },
};
