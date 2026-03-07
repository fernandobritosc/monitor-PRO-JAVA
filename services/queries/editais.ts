/**
 * Data Access Layer — Editais / Matérias
 * Centraliza todas as queries da tabela `editais_materias`
 */
import { supabase } from '../supabase';
import { EditalMateria } from '../../types';

export const editaisQueries = {
    /** Busca todos os editais de um usuário */
    async getByUser(userId: string) {
        const { data, error } = await supabase
            .from('editais_materias')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data ?? [];
    },

    /** Busca todos os editais (admin / templates) */
    async getAll(limit = 2000) {
        const { data, error } = await supabase
            .from('editais_materias')
            .select('*')
            .limit(limit);
        if (error) throw error;
        return data ?? [];
    },

    /** Faz upsert de editais (cria ou atualiza) */
    async upsert(records: Partial<EditalMateria>[], ignoreDuplicates = false) {
        const { error } = await supabase
            .from('editais_materias')
            .upsert(records, { onConflict: 'user_id,concurso,materia', ignoreDuplicates });
        if (error) throw error;
    },

    /** Insere novos editais */
    async insert(records: Partial<EditalMateria>[]) {
        const { error } = await supabase.from('editais_materias').insert(records);
        if (error) throw error;
    },

    /** Atualiza editais existentes via upsert */
    async update(records: Partial<EditalMateria>[]) {
        const { error } = await supabase.from('editais_materias').upsert(records);
        if (error) throw error;
    },

    /** Deleta editais por IDs */
    async deleteMany(ids: string[]) {
        const { error } = await supabase
            .from('editais_materias')
            .delete()
            .in('id', ids);
        if (error) throw error;
    },

    /** Conta os editais de um usuário por concurso */
    async countByUser(userId: string) {
        const { count, error } = await supabase
            .from('editais_materias')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        if (error) throw error;
        return count ?? 0;
    },

    /** Busca IDs de editais de um concurso específico */
    async getIdsByConcurso(userId: string, concurso: string) {
        const { data, error } = await supabase
            .from('editais_materias')
            .select('id')
            .eq('user_id', userId)
            .eq('concurso', concurso);
        if (error) throw error;
        return (data ?? []).map(i => i.id);
    },
};
