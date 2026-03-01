import React, { useState, useEffect, lazy, Suspense } from 'react';
import { supabase, isConfigured } from './services/supabase';
import { ViewType, StudyRecord } from './types';
import Layout from './components/Layout';
import ConfigScreen from './components/ConfigScreen';

// Lazy Loaded Views
const Login = lazy(() => import('./views/Login'));
const HomeView = lazy(() => import('./views/HomeView'));
const StudyForm = lazy(() => import('./views/StudyForm').then(m => ({ default: m.StudyForm })));
const History = lazy(() => import('./views/History'));
const Revisoes = lazy(() => import('./views/Revisoes'));
const Simulados = lazy(() => import('./views/Simulados'));
const Configurar = lazy(() => import('./views/Configurar'));
const QuestionsBank = lazy(() => import('./views/QuestionsBank'));
const Reports = lazy(() => import('./views/Reports'));
const Onboarding = lazy(() => import('./views/Onboarding'));
const EditalProgress = lazy(() => import('./views/EditalProgress'));
const Flashcards = lazy(() => import('./views/Flashcards'));
const Discursiva = lazy(() => import('./views/Discursiva'));
const HubView = lazy(() => import('./views/HubView'));
const RankingView = lazy(() => import('./views/RankingView'));
const GabaritoIA = lazy(() => import('./views/GabaritoIA'));
const ErrorAnalysisView = lazy(() => import('./views/ErrorAnalysisView').then(m => ({ default: m.ErrorAnalysisView })));
import { useAppData } from './hooks/useAppData';
import { useStore } from './hooks/useStore';
import { WifiOff, Loader2, RefreshCw, Database, LogIn, AlertOctagon } from 'lucide-react';
import { DashboardSkeleton, FlashcardSkeleton } from './components/shared/Skeleton';

const APP_VERSION = '1.0.33'; // Build: 01/03/2026 10:45 (Brasília)

import { preserveMissaoOnClear } from './utils/localStorage';
import { logger } from './utils/logger';
import { identifyUser } from './services/telemetry';

const App: React.FC = () => {
  const {
    session, setSession,
    userEmail, setUserEmail,
    activeView, setActiveView,
    theme, setTheme, toggleTheme,
    isOfflineMode: storeOfflineMode, setIsOfflineMode: setStoreOfflineMode,
    isError: storeIsError, setIsError: setStoreIsError,
    isLoading, setIsLoading
  } = useStore();

  const loading = isLoading;

  const [needsConfig, setNeedsConfig] = useState(!isConfigured);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  const {
    editais,
    studyRecords,
    missaoAtiva,
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
  } = useAppData(session);

  useEffect(() => {
    setStoreOfflineMode(isOfflineMode);
    setStoreIsError(isError);
  }, [isOfflineMode, isError, setStoreOfflineMode, setStoreIsError]);

  const handleLogout = async () => {
    setIsLoading(true);

    const userId = session?.user?.id;
    logger.logoutExecuted(userId);

    // FIX: Cast supabase.auth to any to resolve TypeScript error regarding missing 'signOut' property.
    await (supabase.auth as any).signOut();

    // Usa função utilitária para preservar missão e limpar cache
    preserveMissaoOnClear(userId);

    window.location.reload();
  };

  useEffect(() => {
    if (!isConfigured) {
      setNeedsConfig(true);
      setIsLoading(false);
      return;
    }

    // Imediatamente verifica a sessão ativa para evitar o flash da tela de login.
    // Este é o método mais robusto para restaurar a sessão no Supabase.
    (supabase.auth as any).getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email ?? '');
        identifyUser(session.user.id, session.user.email ?? '');
      } else {
        const cachedEmail = localStorage.getItem('monitorpro_saved_email');
        setUserEmail(cachedEmail || '');
      }
      setIsLoading(false); // Essencial: para o loading apenas após a verificação inicial.
    });

    // Em seguida, inscreve-se para futuras mudanças de estado de autenticação (login, logout).
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email ?? '');
        localStorage.setItem('monitorpro_saved_email', session.user.email ?? '');
        identifyUser(session.user.id, session.user.email ?? '');
      } else {
        const cachedEmail = localStorage.getItem('monitorpro_saved_email');
        setUserEmail(cachedEmail || '');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // One-time migration to HUB for existing users
  useEffect(() => {
    if (session && (activeView === 'HOME' || !activeView)) {
      const migrated = localStorage.getItem('hub_migrated_v1');
      if (!migrated) {
        setActiveView('HUB');
        localStorage.setItem('hub_migrated_v1', 'true');
      }
    }
  }, [session, activeView, setActiveView]);

  const handleTemplateSelection = async (templateData: any[]) => {
    if (!session?.user?.id) return;
    try {
      const payload = templateData.map(t => ({ ...t, user_id: session.user.id }));
      const { error } = await supabase.from('editais_materias').upsert(payload, { onConflict: 'user_id,concurso,materia', ignoreDuplicates: true });
      if (error) throw error;
      await fetchData(session.user.id);
      setShowOnboarding(false);
    } catch (err: any) {
      alert(err.message?.includes('constraint') ? "Algumas matérias já existiam." : "Erro: " + err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <Loader2 className="w-16 h-16 text-[#22D3EE] animate-spin opacity-20" />
        <Loader2 className="w-16 h-16 text-[#22D3EE] animate-spin absolute inset-0" style={{ animationDuration: '3s' }} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-white text-xs font-black uppercase tracking-[0.3em] opacity-50">Monitor<span className="text-[#22D3EE]">Pro</span> v{APP_VERSION}</p>
        <p className="text-[#22D3EE] text-[9px] font-bold uppercase tracking-widest animate-pulse">Iniciando interface segura...</p>
      </div>
    </div>
  );

  if (needsConfig) return <ConfigScreen initialError={!isConfigured ? "Ambiente não configurado." : "Sessão expirada."} />;

  if (!session && !isOfflineMode) return <Suspense fallback={<LoadingFallback />}><Login /></Suspense>;

  if (showOnboarding && !dataLoading && !isOfflineMode) return <Suspense fallback={<LoadingFallback />}><Onboarding onSelectTemplate={handleTemplateSelection} userEmail={userEmail} /></Suspense>;

  const renderView = () => {
    // Se estiver carregando dados e NÃO tivermos registros ainda (primeiro carregamento sem cache),
    // mostramos o Skeleton correspondente à view ativa.
    if (dataLoading && studyRecords.length === 0 && !isOfflineMode && activeView !== 'CONFIGURAR') {
      return (
        <div className="animate-in fade-in duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <RefreshCw size={20} className="text-indigo-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Sincronizando</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando resposta do motor de dados...</p>
            </div>
          </div>
          {activeView === 'FLASHCARDS' ? <FlashcardSkeleton /> : <DashboardSkeleton />}
        </div>
      );
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch (activeView) {
            case 'HUB': return <HubView setActiveView={setActiveView} userEmail={userEmail} />;
            case 'HOME': case 'DASHBOARD': return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
            case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
            case 'FLASHCARDS': return <Flashcards missaoAtiva={missaoAtiva} editais={editais} />;
            case 'DISCURSIVA': return <Discursiva />;
            case 'GABARITO_IA': return <GabaritoIA />;
            case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
            case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => session?.user?.id && fetchData(session.user.id)} />;
            case 'REVISOES': return <Revisoes records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onUpdated={() => session?.user?.id && fetchData(session.user.id)} />;
            case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onRecordDelete={handleRecordDelete} />;
            case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onGroupDelete={handleMultipleRecordDelete} setActiveView={setActiveView} />;
            case 'REGISTRAR_SIMULADO': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => { session?.user?.id && fetchData(session.user.id); setActiveView('SIMULADOS'); }} isSimulado={true} onCancel={() => setActiveView('SIMULADOS')} />;
            case 'ANALISE_ERROS': return <ErrorAnalysisView records={studyRecords} missaoAtiva={missaoAtiva} />;
            case 'RELATORIOS': return <Reports records={studyRecords} missaoAtiva={missaoAtiva} />;
            case 'CONFIGURAR': return <Configurar editais={editais} records={studyRecords} missaoAtiva={missaoAtiva} onUpdated={() => session?.user?.id && fetchData(session.user.id)} setMissaoAtiva={setMissaoAtiva} />;
            default: return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <Layout
      activeView={activeView}
      setActiveView={setActiveView}
      userEmail={userEmail || 'Usuário Offline'}
      onLogout={handleLogout}
      missaoAtiva={missaoAtiva}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      {dataLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--accent)] animate-pulse z-[60]" />}
      {backgroundSyncing && !isOfflineMode && (<div className="fixed bottom-4 right-4 bg-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-white/5 z-[100] animate-in fade-in"><RefreshCw size={10} className="animate-spin" /> v{APP_VERSION}</div>)}
      {isOfflineMode && !isError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl mb-6 flex items-center justify-between gap-4 text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2"><Database size={16} /><span>Modo Offline (v{APP_VERSION}).</span><span className="hidden md:inline font-normal opacity-70">Exibindo dados do cache. Algumas funções podem estar limitadas.</span></div>
          {session ? (<button onClick={() => session?.user?.id && fetchData(session.user.id)} className="underline hover:text-white flex items-center gap-1"><RefreshCw size={12} /> Tentar Conectar</button>) : (<button onClick={handleLogout} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"><LogIn size={12} /> Fazer Login</button>)}
        </div>
      )}
      {!isError ? (
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <WifiOff className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Erro de Inicialização</h2>
          <p className="text-slate-500 text-sm max-w-md mb-8">
            Não conseguimos conectar ao seu banco de dados. Verifique sua conexão ou as configurações de acesso.
          </p>
          <button
            onClick={() => session?.user?.id && fetchData(session.user.id)}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl font-bold transition-all"
          >
            <RefreshCw size={18} /> Tentar Reconectar
          </button>
        </div>
      )}
    </Layout>
  );
};

// Componente simples de Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-900/20 border border-red-500/30 rounded-[2rem] text-center my-10">
          <AlertOctagon className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-black text-white uppercase mb-2">Ops! Algo deu errado na interface</h2>
          <p className="text-red-200/60 text-xs mb-6 font-mono break-all">{this.state.error?.message || "Erro desconhecido"}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-xs font-bold transition-all"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-500">
    <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin opacity-40" />
    <p className="text-[hsl(var(--text-muted))] text-[10px] font-black uppercase tracking-[0.2em]">Carregando Módulo...</p>
  </div>
);

export default App;
