/**
 * Data Access Layer — Discursivas
 * Centraliza queries da tabela `discursivas`
 */
import { supabase } from '../supabase';
import { Discursiva } from '../../types';

export const discursivasQueries = {
    /** Lista todas as discursivas (desc por data) */
    async getAll() {
        const { data, error } = await supabase
            .from('discursivas')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    /** Insere uma nova discursiva e retorna o registro */
    async insert(record: Partial<Discursiva>) {
        const { data, error } = await supabase
            .from('discursivas')
            .insert(record)
            .select()
            .single();
        if (error) throw error;
        return data as Discursiva;
    },

    /** Deleta uma discursiva */
    async delete(id: string) {
        const { error } = await supabase.from('discursivas').delete().eq('id', id);
        if (error) throw error;
    },
};
