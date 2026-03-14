/**
 * Utilitários para gerenciamento de localStorage
 * Centraliza a lógica de persistência da missão ativa e outras preferências do usuário
 */

import { logger } from './logger';

const MISSAO_PREFIX = 'monitorpro_missao';
const CACHE_PREFIX = 'monitorpro_cache';

/**
 * Gera a chave do localStorage para a missão ativa de um usuário específico
 */
export const getMissaoKey = (userId?: string): string => {
    return userId ? `${MISSAO_PREFIX}_${userId}` : `${CACHE_PREFIX}_missao`;
};

/**
 * Obtém a missão ativa do localStorage
 * @param userId - ID do usuário (opcional, usa chave global se não fornecido)
 * @returns Nome da missão ativa ou null
 */
export const getMissaoAtiva = (userId?: string): string | null => {
    // Tenta primeiro a chave específica do usuário
    if (userId) {
        const userValue = localStorage.getItem(getMissaoKey(userId));
        if (userValue) return userValue;
    }
    // Fallback para a chave global
    return localStorage.getItem(getMissaoKey());
};

/**
 * Salva a missão ativa no localStorage
 * @param missao - Nome da missão a ser salva
 * @param userId - ID do usuário (opcional, usa chave global se não fornecido)
 */
export const saveMissaoAtiva = (missao: string, userId?: string): void => {
    const key = getMissaoKey(userId);
    localStorage.setItem(key, missao);
    logger.missaoSaved(missao, key, userId);
};

/**
 * Remove a missão ativa do localStorage
 * @param userId - ID do usuário (opcional, usa chave global se não fornecido)
 */
export const clearMissaoAtiva = (userId?: string): void => {
    const key = getMissaoKey(userId);
    localStorage.removeItem(key);
};

/**
 * Preserva a missão ativa antes de limpar o localStorage
 * Útil para manter a seleção do usuário durante logout
 * Salva em AMBAS as chaves (user-specific e global) para garantir persistência
 * @param userId - ID do usuário (opcional)
 */
export const preserveMissaoOnClear = (userId?: string): void => {
    const currentMissao = getMissaoAtiva(userId) || getMissaoAtiva(); // Tenta ambas as chaves
    logger.cacheCleared(!!currentMissao, currentMissao || undefined);
    localStorage.clear();

    if (currentMissao) {
        // Salva em AMBAS as chaves para garantir que será encontrada após login
        if (userId) {
            saveMissaoAtiva(currentMissao, userId); // Chave específica do usuário
        }
        saveMissaoAtiva(currentMissao); // Chave global (fallback)
        logger.info('CACHE', 'Missão preservada em ambas as chaves', {
            missao: currentMissao,
            userKey: userId ? getMissaoKey(userId) : 'N/A',
            globalKey: getMissaoKey()
        });
    }
};

/**
 * Migra a missão da chave global para a chave específica do usuário
 * Útil para transição suave da arquitetura antiga para a nova
 * @param userId - ID do usuário
 */
export const migrateMissaoToUserKey = (userId: string): void => {
    const globalMissao = getMissaoAtiva(); // Sem userId = chave global
    const userMissao = getMissaoAtiva(userId);

    // Se não há missão específica do usuário mas há global, migra
    if (!userMissao && globalMissao) {
        const oldKey = getMissaoKey();
        const newKey = getMissaoKey(userId);
        logger.migrationExecuted(oldKey, newKey, globalMissao);
        saveMissaoAtiva(globalMissao, userId);
    }
};

/**
 * Obtém todas as chaves de cache do MonitorPro
 */
export const getAllCacheKeys = (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('monitorpro_')) {
            keys.push(key);
        }
    }
    return keys;
};

/**
 * Limpa todo o cache do MonitorPro exceto a missão ativa
 * @param userId - ID do usuário (opcional)
 */
export const clearCacheExceptMissao = (userId?: string): void => {
    const currentMissao = getMissaoAtiva(userId);
    const allKeys = getAllCacheKeys();

    allKeys.forEach(key => localStorage.removeItem(key));

    if (currentMissao) {
        saveMissaoAtiva(currentMissao, userId);
        logger.info('CACHE', 'Cache limpo, missão preservada', { missao: currentMissao });
    }
};
