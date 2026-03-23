import React, { useEffect } from 'react';
import { BrowserRouter as Router, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './views/Login';
import AppRouter from './components/features/AppRouter';
import AppStatusIndicators from './components/ui/AppStatusIndicators';
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
      />

      <AppRouter
        userEmail={userEmail}
        session={session}
      />
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
