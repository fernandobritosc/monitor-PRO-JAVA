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
    if (window.confirm('Deseja limpar o cache local e forçar sincronização? Isso pode resolver dados zerados.')) {
      try {
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

  // Debugging logic for records, moved here to be syntactically correct
  // Note: 'records' is not defined in App.tsx. Assuming 'studyRecords' is intended.
  const records = studyRecords || []; // Assuming studyRecords are the 'records' referred to in the instruction
  const activeRecords = records.filter(r =>
    r.concurso === missaoAtiva && r.dificuldade !== 'Simulado' && r.materia !== 'SIMULADO'
  );

  if (records.length > 0 && activeRecords.length === 0) {
    console.warn(`⚠️ Revisoes: ${records.length} registros totais, mas 0 para a missão "${missaoAtiva}"`);
  }

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
