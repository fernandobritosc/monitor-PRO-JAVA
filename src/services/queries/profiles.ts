/**
 * Data Access Layer — Profiles e Ranking
 * Backend próprio (Fastify + Postgres na Oracle VM) via shim `src/lib/supabase.ts`:
 * `supabase.rpc('get_ranking_by_period')` → POST /api/rpc/get_ranking_by_period
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

    /** Busca o ranking filtrado por período (e missão, quando o backend suportar) */
    async getRankingFiltered(days: number | null, missao: string | null = null): Promise<RankingPeriodRow[]> {
        // Backend próprio: tenta POST /rpc/get_ranking_by_period com p_concurso;
        // se o backend na VM ainda não aceita, cai para só p_days.
        const attempts: Record<string, unknown>[] = [];
        if (missao) attempts.push({ p_days: days, p_concurso: missao });
        attempts.push({ p_days: days });

        let lastError: { message?: string } | null = null;
        let result: { data: unknown; error: { message?: string } | null } | null = null;
        for (const params of attempts) {
            const res = await supabase.rpc('get_ranking_by_period', params);
            if (!res.error) {
                result = res;
                break;
            }
            lastError = res.error as { message?: string };
            // Se o erro for "argumento inexistente" (RPC antiga), tenta próxima assinatura
            const msg = String(lastError?.message || '');
            if (!/p_concurso|function|argument/i.test(msg)) {
                result = res;
                break;
            }
        }

        // Log diagnóstico: resposta bruta do RPC para cada período/missão
        console.log(`[RPC get_ranking_by_period] p_days=${days} p_concurso=${missao ?? 'ALL'}`, { data: result?.data, error: result?.error ?? lastError });

        if (!result || result.error) {
            const errMsg = result?.error?.message || lastError?.message || 'Erro no RPC get_ranking_by_period';
            console.error(`[RPC get_ranking_by_period] ERRO p_days=${days}`, result?.error ?? lastError);
            throw new Error(errMsg);
        }

        const rows = (result.data ?? []) as RankingPeriodRow[];
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
