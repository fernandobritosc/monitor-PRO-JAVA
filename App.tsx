import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from './services/supabase';
import { ViewType, StudyRecord, EditalMateria } from './types';
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
import { WifiOff, Loader2, RefreshCw, Database, LogIn } from 'lucide-react';

const APP_VERSION = '1.0.28'; // Protocolo de Versão Atualizado

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [needsConfig, setNeedsConfig] = useState(!isConfigured);
  const [isError, setIsError] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);

  const [activeView, setActiveView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monitorpro_last_view');
      return (saved as ViewType) || 'HOME';
    }
    return 'HOME';
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (activeView) localStorage.setItem('monitorpro_last_view', activeView);
  }, [activeView]);

  const loadFromCache = () => {
      try {
          const cachedEditais = localStorage.getItem('monitorpro_cache_editais');
          const cachedRecords = localStorage.getItem('monitorpro_cache_records');
          
          if (cachedEditais && cachedRecords) {
              const parsedEditais = JSON.parse(cachedEditais);
              const parsedRecords = JSON.parse(cachedRecords);
              
              if (parsedEditais.length > 0) {
                  setEditais(parsedEditais);
                  setStudyRecords(parsedRecords);
                  
                  const cachedMissao = localStorage.getItem('monitorpro_cache_missao');
                  if (cachedMissao) {
                      setMissaoAtiva(cachedMissao);
                  } else {
                      const principal = parsedEditais.find((e: any) => e.is_principal);
                      setMissaoAtiva(principal ? principal.concurso : parsedEditais[0].concurso);
                  }

                  const savedEmail = localStorage.getItem('monitorpro_saved_email');
                  if (savedEmail) setUserEmail(savedEmail);
                  
                  return true;
              }
          }
      } catch (e) {
          console.error("Erro ao carregar do cache:", e);
      }
      return false;
  };

  const handleLogout = async () => {
      setLoading(true);
      await supabase.auth.signOut();
      localStorage.clear(); // Limpa tudo para garantir um logout limpo
      window.location.reload(); // Força o recarregamento para estado inicial
  };

  useEffect(() => {
    if (!isConfigured) {
      setNeedsConfig(true);
      setLoading(false);
      return;
    }

    // onAuthStateChange é a fonte única de verdade para a sessão.
    // Ele dispara imediatamente com a sessão em cache e sempre que ela muda.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserEmail(session?.user?.email ?? '');

      if (!session) {
        // Se não há sessão, verifica se podemos operar em modo offline com dados em cache
        const hasCache = loadFromCache();
        setIsOfflineMode(hasCache);
        if (!hasCache) {
            // Se não tem cache, limpa os dados para não mostrar informações antigas na tela de login
            setEditais([]);
            setStudyRecords([]);
        }
      } else {
        setIsOfflineMode(false);
      }

      // Para o loading SÓ DEPOIS da primeira verificação de autenticação.
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // A dependência vazia garante que isso rode apenas uma vez na montagem.

  useEffect(() => {
    const handleOnline = () => {
        if (session?.user?.id) fetchData(session.user.id);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session]);

  useEffect(() => {
    if (session?.user?.id && !isOfflineMode) {
      fetchData(session.user.id);
    }
  }, [session?.user?.id, isOfflineMode]); 

  const fetchData = async (userId: string, retryCount = 0) => {
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
        setMissaoAtiva(prev => {
           if (prev && finalEditais.some((e: any) => e.concurso === prev)) return prev;
           const principal = finalEditais.find((e: any) => e.is_principal);
           return principal ? principal.concurso : finalEditais[0].concurso;
        });
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
      
      localStorage.setItem('monitorpro_cache_editais', JSON.stringify(finalEditais));
      localStorage.setItem('monitorpro_cache_records', JSON.stringify(finalRecords));
      localStorage.setItem('monitorpro_cache_missao', missaoAtiva);

      setIsOfflineMode(false);
      setIsError(false);

    } catch (error: any) {
      console.error(`Erro de sincronização (Tentativa ${retryCount + 1}):`, error);
      if (retryCount < 2) {
          setTimeout(() => fetchData(userId, retryCount + 1), 2000);
      } else {
          if (!hasData) {
              const loaded = loadFromCache();
              if (!loaded) setIsError(true);
          } else {
              setIsOfflineMode(true);
          }
      }
    } finally {
      setDataLoading(false);
      setBackgroundSyncing(false);
    }
  };

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

  const handleRecordUpdate = async (updatedRecord: StudyRecord) => {
    setStudyRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    if (isOfflineMode) { alert("Modo Offline: Alteração salva localmente (visualização). Conecte-se para salvar no servidor."); return; }
    const { error } = await supabase.from('registros_estudos').update(updatedRecord).eq('id', updatedRecord.id);
    if (error) { alert("Erro ao salvar online."); if (session?.user?.id) fetchData(session.user.id); }
  };

  const handleRecordDelete = async (recordId: string) => {
    const original = studyRecords;
    setStudyRecords(prev => prev.filter(r => r.id !== recordId));
    const { error } = await supabase.from('registros_estudos').delete().eq('id', recordId);
    if (error) { alert("Erro ao excluir."); setStudyRecords(original); }
  };

  const handleMultipleRecordDelete = async (recordIds: string[]) => {
    const original = studyRecords;
    setStudyRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
    const { error } = await supabase.from('registros_estudos').delete().in('id', recordIds);
    if (error) { alert("Erro ao excluir."); setStudyRecords(original); }
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
            {session ? (<button onClick={() => session?.user?.id && fetchData(session.user.id)} className="underline hover:text-white flex items-center gap-1"><RefreshCw size={12} /> Tentar Conectar</button>) : (<button onClick={() => supabase.auth.signOut()} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"><LogIn size={12} /> Fazer Login</button>)}
        </div>
      )}
      {isError && (<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold shadow-lg animate-in slide-in-from-top-2"><div className="flex items-center gap-3"><div className="p-2 bg-red-500/20 rounded-full animate-pulse"><WifiOff size={20} /></div><div className="flex flex-col"><span>Falha na Conexão.</span><span className="text-[10px] opacity-70 font-normal">Não foi possível baixar seus dados e não há cópia local.</span></div></div><button onClick={() => session?.user?.id && fetchData(session.user.id)} className="md:ml-auto flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-all active:scale-95"><RefreshCw size={14} /> Tentar Novamente</button></div>)}
      {!isError && renderView()}
    </Layout>
  );
};

export default App;