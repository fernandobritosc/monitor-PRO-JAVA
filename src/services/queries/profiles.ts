/**
 * Data Access Layer — Profiles e Ranking
 * Centraliza queries de `profiles` e `ranking_geral`
 */
import { supabase } from '../supabase';
import { logger } from '../../utils/logger';

interface RankingPeriodRow {
    user_id: string;
    name?: string | null;
    total_tempo: number;
    total_questoes: number;
}

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

    /** Busca o ranking filtrado por período via RPC */
    async getRankingFiltered(days: number | null): Promise<RankingPeriodRow[]> {
        const { data, error } = await supabase
            .rpc('get_ranking_by_period', { p_days: days });
        if (error) {
            logger.error('DATA', 'ERRO NO RPC get_ranking_by_period:', error);
            throw error;
        }

        const rows = (data ?? []) as RankingPeriodRow[];
        if (rows.length === 0) return rows;

        // O RPC nem sempre retorna o nome do usuário; complementa com a view ranking_geral.
        try {
            const { data: full } = await supabase
                .from('ranking_geral')
                .select('*');
            const nameByUserId = new Map<string, string>();
            (full ?? []).forEach((r: { user_id: string; name?: string | null }) => {
                if (r.name) nameByUserId.set(r.user_id, r.name);
            });
            return rows.map(r => ({
                ...r,
                name: r.name || nameByUserId.get(r.user_id) || null
            }));
        } catch (err) {
            logger.warn('DATA', 'Falha ao complementar nomes do ranking:', err);
            return rows;
        }
    },

    /** Cria ou atualiza um perfil (upsert) */
    async upsert(profile: { id: string; email?: string; username?: string }) {
        const { error } = await supabase
            .from('profiles')
            .upsert(profile, { onConflict: 'id' });
        if (error) throw error;
    },
};
