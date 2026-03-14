/**
 * Data Access Layer — Profiles e Ranking
 * Centraliza queries de `profiles` e `ranking_geral`
 */
import { supabase } from '../supabase';

export const profilesQueries = {
    /** Verifica se um usuário é admin */
    async isAdmin(userId: string): Promise<boolean> {
        const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .maybeSingle();
        return data?.is_admin === true;
    },

    /** Busca perfil completo de um usuário */
    async getById(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    /** Busca todos os perfis (admin) */
    async getAll() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    /** Atualiza status de aprovação */
    async updateApproval(userId: string, approved: boolean) {
        const { error } = await supabase
            .from('profiles')
            .update({ approved })
            .eq('id', userId);
        if (error) throw error;
    },

    /** Busca o ranking global */
    async getRanking() {
        const { data, error } = await supabase
            .from('ranking_geral')
            .select('*');
        if (error) throw error;
        return data ?? [];
    },
};
