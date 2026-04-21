import React, { useEffect } from 'react';
import { BrowserRouter as Router, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { db } from './services/offline/db';
import Layout from './components/Layout';
import Login from './views/Login';
import AppRouter from './components/features/AppRouter';
import AppStatusIndicators from './components/ui/AppStatusIndicators';
import { SyncStatus } from './components/ui/SyncStatus';
import { useAppStore } from './stores/useAppStore';
import { useStudyRecords } from './hooks/queries/useStudyRecords';
import { useEditais } from './hooks/queries/useEditais';
import { syncService } from './services/offline/sync';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useSentry } from './hooks/useSentry';
import { APP_VERSION } from './constants';

const AppContent: React.FC = () => {
  const { session, userEmail, loading: authLoading, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications(session);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    isDarkMode,
    toggleDarkMode,
    missaoAtiva,
    backgroundSyncing,
    isOfflineMode,
    reset
  } = useAppStore();

  // Aplica/remove a classe "dark" no <html> sempre que isDarkMode mudar
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const {
    studyRecords,
    isLoading: studyLoading,
    isError: studyError,
    refetch: refetchStudies
  } = useStudyRecords(session?.user?.id);

  const {
    isLoading: editaisLoading,
    isError: editaisError
  } = useEditais(session?.user?.id);

  useSentry(session);

  const isLoading = authLoading || studyLoading || editaisLoading;
  const isError = studyError || editaisError;

  // Só reseta quando o auth terminou de carregar e não há sessão (logout real)
  // Evita reset prematuro durante o carregamento inicial do Supabase
  useEffect(() => {
    if (!authLoading && !session) {
      reset();
    }
  }, [authLoading, session, reset]);

  const handleResetCache = async () => {
    // 1. Verificar registros pendentes antes de qualquer ação
    const pendingTotal = await db.studyRecords.where('syncStatus').equals('pending').count();
    
    let confirmMsg = 'Deseja limpar o cache local e forçar a recarga?';
    if (pendingTotal > 0) {
      confirmMsg = `⚠️ ATENÇÃO: Você tem ${pendingTotal} registros que ainda NÃO foram sincronizados com a nuvem. Se você limpar o cache agora, esses dados serão perdidos DEFINITIVAMENTE. Deseja continuar mesmo assim?`;
    }

    if (window.confirm(confirmMsg)) {
      try {
        // TENTA SINCRONIZAR ANTES DE LIMPAR (Se houver internet)
        if (navigator.onLine && pendingTotal > 0) {
          console.log('🔄 Sincronizando dados pendentes antes da limpeza...');
          // Importamos o syncService em App.tsx se necessário
          await syncService.syncPendingAttempts();
        }

        await db.studyRecords.clear();
        await db.editais.clear();
        queryClient.clear();
        window.location.reload();
      } catch (err) {
        console.error('Erro ao limpar cache:', err);
      }
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[hsl(var(--bg-main))] flex items-center justify-center text-[hsl(var(--accent))]">Carregando...</div>;
  if (!session) return <Login />;

  return (
    <Layout
      userEmail={userEmail}
      onLogout={signOut}
      missaoAtiva={missaoAtiva}
      theme={isDarkMode ? 'dark' : 'light'}
      toggleTheme={toggleDarkMode}
    >

      <AppStatusIndicators
        isLoading={isLoading}
        backgroundSyncing={backgroundSyncing}
        isOfflineMode={isOfflineMode}
        isError={isError}
        session={session}
        appVersion={APP_VERSION}
        onFetchData={() => refetchStudies()}
        onLogout={signOut}
        onResetCache={handleResetCache}
      />

      <AppRouter
        userEmail={userEmail}
        session={session}
      />
      <SyncStatus />

    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
};

export default App;
