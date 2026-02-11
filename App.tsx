import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from './services/supabase';
import { ViewType, StudyRecord } from './types';
import Layout from './components/Layout';
import Login from './views/Login';
import ConfigScreen from './components/ConfigScreen';
import HomeView from './views/HomeView';
import { StudyForm } from './views/StudyForm';
import History from './views/History';
import Revisoes from './views/Revisoes';
import Simulados from './views/Simulados';
import Configurar from './views/Configurar';
import WeeklyGuide from './views/WeeklyGuide';
import QuestionsBank from './views/QuestionsBank';
import Reports from './views/Reports';
import Onboarding from './views/Onboarding';
import EditalProgress from './views/EditalProgress';
import Flashcards from './views/Flashcards';
import Discursiva from './views/Discursiva';
import GabaritoIA from './views/GabaritoIA';
import { useAppData } from './hooks/useAppData';
import { WifiOff, Loader2, RefreshCw, Database, LogIn } from 'lucide-react';

const APP_VERSION = '1.0.28'; // Protocolo de Versão Atualizado

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [needsConfig, setNeedsConfig] = useState(!isConfigured);

  const [activeView, setActiveView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monitorpro_last_view');
      return (saved as ViewType) || 'HOME';
    }
    return 'HOME';
  });

  useEffect(() => {
    if (activeView) localStorage.setItem('monitorpro_last_view', activeView);
  }, [activeView]);

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
  
  const handleLogout = async () => {
    setLoading(true);
    // FIX: Cast supabase.auth to any to resolve TypeScript error regarding missing 'signOut' property.
    await (supabase.auth as any).signOut();
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    if (!isConfigured) {
      setNeedsConfig(true);
      setLoading(false);
      return;
    }

    // Rely solely on onAuthStateChange for session management.
    // It handles the initial session restore and avoids race conditions
    // that can occur with a manual getSession() call on app load.
    // FIX: Cast supabase.auth to any to resolve TypeScript error regarding missing 'onAuthStateChange' property.
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email ?? '');
        localStorage.setItem('monitorpro_saved_email', session.user.email ?? '');
      } else {
        const cachedEmail = localStorage.getItem('monitorpro_saved_email');
        setUserEmail(cachedEmail || ''); // Use cached email or clear it
      }
      setLoading(false); // Only stop loading after session state is determined
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <div className="min-h-screen bg-[#12151D] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">MonitorPro v{APP_VERSION}</p>
      <p className="text-slate-600 text-[10px] animate-pulse">Restaurando sessão...</p>
    </div>
  );

  if (needsConfig) return <ConfigScreen initialError={!isConfigured ? "Ambiente não configurado." : "Sessão expirada."} />;

  if (!session && !isOfflineMode) return <Login />;
  
  if (showOnboarding && !dataLoading && !isOfflineMode) return <Onboarding onSelectTemplate={handleTemplateSelection} userEmail={userEmail} />;

  const renderView = () => {
    switch (activeView) {
      case 'HOME': case 'DASHBOARD': return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
      case 'FLASHCARDS': return <Flashcards missaoAtiva={missaoAtiva} editais={editais} />;
      case 'DISCURSIVA': return <Discursiva />;
      case 'GABARITO_IA': return <GabaritoIA />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => session?.user?.id && fetchData(session.user.id)} />;
      case 'REVISOES': return <Revisoes records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onUpdated={() => session?.user?.id && fetchData(session.user.id)} />;
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onRecordDelete={handleRecordDelete} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onGroupDelete={handleMultipleRecordDelete} setActiveView={setActiveView} />;
      case 'REGISTRAR_SIMULADO': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => { session?.user?.id && fetchData(session.user.id); setActiveView('SIMULADOS'); }} isSimulado={true} onCancel={() => setActiveView('SIMULADOS')} />;
      case 'RELATORIOS': return <Reports records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'CONFIGURAR': return <Configurar editais={editais} missaoAtiva={missaoAtiva} onUpdated={() => session?.user?.id && fetchData(session.user.id)} setMissaoAtiva={setMissaoAtiva} />;
      default: return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
    }
  };

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} userEmail={userEmail || 'Usuário Offline'} onLogout={handleLogout} missaoAtiva={missaoAtiva}>
      {dataLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse z-[60]" />}
      {backgroundSyncing && !isOfflineMode && (<div className="fixed bottom-4 right-4 bg-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-white/5 z-[100] animate-in fade-in"><RefreshCw size={10} className="animate-spin" /> v{APP_VERSION}</div>)}
      {isOfflineMode && !isError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl mb-6 flex items-center justify-between gap-4 text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2"><Database size={16} /><span>Modo Offline (v{APP_VERSION}).</span><span className="hidden md:inline font-normal opacity-70">Exibindo dados do cache. Algumas funções podem estar limitadas.</span></div>
            {session ? (<button onClick={() => session?.user?.id && fetchData(session.user.id)} className="underline hover:text-white flex items-center gap-1"><RefreshCw size={12} /> Tentar Conectar</button>) : (<button onClick={handleLogout} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"><LogIn size={12} /> Fazer Login</button>)}
        </div>
      )}
      {isError && (<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold shadow-lg animate-in slide-in-from-top-2"><div className="flex items-center gap-3"><div className="p-2 bg-red-500/20 rounded-full animate-pulse"><WifiOff size={20} /></div><div className="flex flex-col"><span>Falha na Conexão.</span><span className="text-[10px] opacity-70 font-normal">Não foi possível baixar seus dados e não há cópia local.</span></div></div><button onClick={() => session?.user?.id && fetchData(session.user.id)} className="md:ml-auto flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-all active:scale-95"><RefreshCw size={14} /> Tentar Novamente</button></div>)}
      {!isError && renderView()}
    </Layout>
  );
};

export default App;