import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { StudyRecord, EditalMateria } from '../types';
import { getMissaoAtiva, saveMissaoAtiva, migrateMissaoToUserKey } from '../utils/localStorage';
import { logger } from '../utils/logger';
// FIX: The `Session` type is often not correctly re-exported by `@supabase/supabase-js` due to bundler issues.
// Importing it directly from `@supabase/auth-js` is a reliable workaround.
import type { Session } from '@supabase/auth-js';

export const useAppData = (session: Session | null) => {
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [missaoAtivaInternal, setMissaoAtivaInternal] = useState<string>('');

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isError, setIsError] = useState(false);

  // Wrapper para setMissaoAtiva que sempre persiste no localStorage com chave específica do usuário
  const setMissaoAtiva = useCallback((newMissao: string | ((prev: string) => string)) => {
    setMissaoAtivaInternal(prev => {
      const finalMissao = typeof newMissao === 'function' ? newMissao(prev) : newMissao;
      if (finalMissao !== prev) {
        const userId = session?.user?.id;
        logger.missaoChanged(prev, finalMissao, userId, 'manual');
        saveMissaoAtiva(finalMissao, userId);
      }
      return finalMissao;
    });
  }, [session?.user?.id]);

  const loadFromCache = useCallback(() => {
    try {
      const cachedEditais = localStorage.getItem('monitorpro_cache_editais');
      const cachedRecords = localStorage.getItem('monitorpro_cache_records');

      if (cachedEditais && cachedRecords) {
        const parsedEditais = JSON.parse(cachedEditais);
        const parsedRecords = JSON.parse(cachedRecords);

        if (parsedEditais.length > 0) {
          setEditais(parsedEditais);
          setStudyRecords(parsedRecords);

          // Usa função utilitária para obter missão (sem userId no modo offline)
          const cachedMissao = getMissaoAtiva();
          if (cachedMissao) {
            setMissaoAtivaInternal(cachedMissao);
          } else {
            const principal = parsedEditais.find((e: any) => e.is_principal);
            setMissaoAtivaInternal(principal ? principal.concurso : parsedEditais[0].concurso);
          }
          setIsOfflineMode(true);
          return true;
        }
      }
    } catch (e) {
      logger.error('DATA', 'Erro ao carregar do cache', { error: e });
    }
    setIsOfflineMode(false);
    return false;
  }, []);

  const fetchData = useCallback(async (userId: string, retryCount = 0) => {
    const hasData = editais.length > 0;

    if (!hasData && retryCount === 0) setDataLoading(true);
    if (hasData) setBackgroundSyncing(true);

    try {
      const { data: loadedEditais, error: editaisError } = await supabase.from('editais_materias').select('*').eq('user_id', userId);
      if (editaisError) throw editaisError;

      const { data: loadedRecords, error: recordsError } = await supabase.from('registros_estudos').select('*').eq('user_id', userId).order('data_estudo', { ascending: false }).limit(2000);
      if (recordsError) throw recordsError;

      const finalEditais = loadedEditais || [];
      const finalRecords = loadedRecords || [];

      setEditais(finalEditais);
      setStudyRecords(finalRecords);

      if (finalEditais.length > 0) {
        // Migra missão da chave global para chave do usuário (se necessário)
        const userId = session?.user?.id;
        if (userId) {
          migrateMissaoToUserKey(userId);
        }

        // Busca missão em cache: tenta chave do usuário primeiro, depois global
        let cachedMissao = getMissaoAtiva(userId);
        if (!cachedMissao) {
          // Fallback: tenta chave global (caso userId ainda não esteja disponível)
          cachedMissao = getMissaoAtiva();
          logger.debug('CACHE', 'Tentando carregar de chave global (fallback)', { cachedMissao });
        }

        setMissaoAtiva(prev => {
          // 1º: Se há cache E existe nos editais, usa o cache (prioridade máxima)
          if (cachedMissao && finalEditais.some((e: any) => e.concurso === cachedMissao)) {
            logger.missaoLoaded(cachedMissao, 'cache', userId);
            return cachedMissao;
          }
          // 2º: Se prev existe nos editais, mantém prev
          if (prev && finalEditais.some((e: any) => e.concurso === prev)) {
            logger.missaoLoaded(prev, 'state', userId);
            return prev;
          }
          // 3º: Seleciona principal ou primeira como fallback
          const principal = finalEditais.find((e: any) => e.is_principal);
          const newMissao = principal ? principal.concurso : finalEditais[0].concurso;
          logger.missaoLoaded(newMissao, 'auto', userId);
          return newMissao;
        });
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }

      localStorage.setItem('monitorpro_cache_editais', JSON.stringify(finalEditais));
      localStorage.setItem('monitorpro_cache_records', JSON.stringify(finalRecords));

      setIsOfflineMode(false);
      setIsError(false);

    } catch (error: any) {
      logger.error('SYNC', `Erro de sincronização (Tentativa ${retryCount + 1})`, { error: error?.message });
      if (retryCount < 2) {
        setTimeout(() => fetchData(userId, retryCount + 1), 2000);
      } else {
        if (!hasData) {
          const loaded = loadFromCache();
          if (loaded) {
            setIsOfflineMode(true);
          } else {
            setIsError(true);
          }
        }
      }
    } finally {
      setDataLoading(false);
      setBackgroundSyncing(false);
    }
  }, [editais.length, loadFromCache]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData(session.user.id);
    } else {
      // Se não há sessão, tenta carregar o cache para o modo offline.
      const loaded = loadFromCache();
      setIsOfflineMode(loaded);
      if (!loaded) {
        setEditais([]);
        setStudyRecords([]);
      }
    }

    const handleOnline = () => {
      if (session?.user?.id) {
        fetchData(session.user.id);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);

  }, [session?.user?.id]);

  const handleRecordUpdate = async (updatedRecord: StudyRecord) => {
    setStudyRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    if (isOfflineMode) {
      alert("Modo Offline: Alteração salva localmente (visualização). Conecte-se para salvar no servidor.");
      return;
    }
    const { error } = await supabase.from('registros_estudos').update(updatedRecord).eq('id', updatedRecord.id);
    if (error) {
      alert("Erro ao salvar online.");
      if (session?.user?.id) fetchData(session.user.id);
    }
  };

  const handleRecordDelete = async (recordId: string) => {
    const original = [...studyRecords];
    setStudyRecords(prev => prev.filter(r => r.id !== recordId));
    const { error } = await supabase.from('registros_estudos').delete().eq('id', recordId);
    if (error) {
      alert("Erro ao excluir.");
      setStudyRecords(original);
    }
  };

  const handleMultipleRecordDelete = async (recordIds: string[]) => {
    const original = [...studyRecords];
    setStudyRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
    const { error } = await supabase.from('registros_estudos').delete().in('id', recordIds);
    if (error) {
      alert("Erro ao excluir em massa.");
      setStudyRecords(original);
    }
  };

  return {
    editais,
    studyRecords,
    missaoAtiva: missaoAtivaInternal,
    setMissaoAtiva,
    showOnboarding,
    setShowOnboarding,
    dataLoading,
    backgroundSyncing,
    isOfflineMode,
    setIsOfflineMode,
    isError,
    fetchData,
    handleRecordUpdate,
    handleRecordDelete,
    handleMultipleRecordDelete
  };
};