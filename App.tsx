
// ... (imports)
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
import { QuestionsBank } from './views/QuestionsBank';
import Reports from './views/Reports';
import Onboarding from './views/Onboarding';
import EditalProgress from './views/EditalProgress';
import Flashcards from './views/Flashcards';
import { WifiOff, Loader2, RefreshCw, Database } from 'lucide-react';

// Safe version check
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.22';

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConfig, setNeedsConfig] = useState(!isConfigured);
  const [isError, setIsError] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Novo estado para modo Cache

  // PERSISTÊNCIA DE VIEW
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

  // --- GERENCIAMENTO DE SESSÃO ---
  useEffect(() => {
    if (!isConfigured) {
      setNeedsConfig(true);
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeSession = async () => {
      try {
        const localToken = localStorage.getItem('monitorpro-auth-token');
        const { data: { session: initialSession } } = await (supabase.auth as any).getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setLoading(false); 
        } else if (localToken) {
           // Tenta recuperar via refresh token se o getSession falhar
           const { data: { session: refreshedSession }, error: refreshError } = await (supabase.auth as any).refreshSession();
           if (refreshedSession && !refreshError) {
               setSession(refreshedSession);
           }
           setLoading(false);
        } else {
           setSession(null);
           setLoading(false);
        }
      } catch (error) {
        console.error("❌ Erro sessão:", error);
        setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: string, newSession: any) => {
      if (mounted) {
        if (newSession) {
             setSession(newSession);
             setLoading(false); 
        } else if (_event === 'SIGNED_OUT') {
             setSession(null);
             setLoading(false);
             localStorage.removeItem('monitorpro_last_view');
             setActiveView('HOME');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- RECONEXÃO AUTOMÁTICA ---
  useEffect(() => {
    const handleOnline = () => {
        console.log("🌐 Online detectado. Tentando sincronizar...");
        if (session?.user?.id) fetchData(session.user.id);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session]);

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    if (session?.user?.id) {
      fetchData(session.user.id);
    } else if (!session && !loading) {
       setEditais([]);
       setStudyRecords([]);
       setMissaoAtiva('');
       setShowOnboarding(false);
    }
  }, [session?.user?.id]); 

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
                  
                  // Restaura missão ativa do cache ou calcula
                  const cachedMissao = localStorage.getItem('monitorpro_cache_missao');
                  if (cachedMissao) {
                      setMissaoAtiva(cachedMissao);
                  } else {
                      const principal = parsedEditais.find((e: any) => e.is_principal);
                      setMissaoAtiva(principal ? principal.concurso : parsedEditais[0].concurso);
                  }
                  
                  setIsOfflineMode(true); // Ativa modo offline (amarelo)
                  setIsError(false); // Remove erro crítico (vermelho)
                  setDataLoading(false);
                  return true;
              }
          }
      } catch (e) {
          console.error("Erro ao ler cache:", e);
      }
      return false;
  };

  const fetchData = async (userId: string, retryCount = 0) => {
    if (retryCount === 0 && editais.length === 0) setDataLoading(true);
    
    try {
      // 1. Busca Editais (Leve)
      const { data: loadedEditais, error: editaisError } = await supabase
        .from('editais_materias')
        .select('*')
        .eq('user_id', userId);

      if (editaisError) throw editaisError;

      // 2. Busca Registros (Pesado)
      // Limitando a 2000 registros mais recentes para evitar timeout em mobile
      const { data: loadedRecords, error: recordsError } = await supabase
        .from('registros_estudos')
        .select('*')
        .eq('user_id', userId)
        .order('data_estudo', { ascending: false })
        .limit(2000);

      if (recordsError) throw recordsError;

      // SUCESSO: Atualiza Estado
      const finalEditais = loadedEditais || [];
      const finalRecords = loadedRecords || [];

      setEditais(finalEditais);
      setStudyRecords(finalRecords);

      // Define Missão Ativa
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
      
      // SUCESSO: Salva Cache Local
      localStorage.setItem('monitorpro_cache_editais', JSON.stringify(finalEditais));
      localStorage.setItem('monitorpro_cache_records', JSON.stringify(finalRecords));
      localStorage.setItem('monitorpro_cache_missao', missaoAtiva);

      setIsOfflineMode(false); // Estamos online e atualizados
      setIsError(false);
      setDataLoading(false);

    } catch (error: any) {
      console.error(`Erro dados (Tentativa ${retryCount + 1}):`, error);
      
      // Retry Logic: Tenta 3 vezes
      if (retryCount < 3) {
          const timeout = (retryCount + 1) * 2000; // 2s, 4s, 6s
          setTimeout(() => fetchData(userId, retryCount + 1), timeout);
      } else {
          // SE FALHAR TUDO: Tenta carregar do Cache
          const loadedFromCache = loadFromCache();
          
          if (!loadedFromCache) {
              setIsError(true); // Só mostra erro crítico se não tiver cache
          }
          setDataLoading(false);
      }
    }
  };

  const handleTemplateSelection = async (templateData: any[]) => {
     if (!session?.user?.id) return;
     try {
        const payload = templateData.map(t => ({ ...t, user_id: session.user.id }));
        const { error } = await supabase.from('editais_materias').upsert(payload, { 
            onConflict: 'user_id,concurso,materia',
            ignoreDuplicates: true 
        });
        if (error) throw error;
        await fetchData(session.user.id);
        setShowOnboarding(false);
     } catch (err: any) {
        alert(err.message?.includes('constraint') ? "Algumas matérias já existiam." : "Erro: " + err.message);
     }
  };

  const handleRecordUpdate = async (updatedRecord: StudyRecord) => {
    // Atualização Otimista
    setStudyRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    
    if (isOfflineMode) {
        alert("Você está offline. As alterações não serão salvas no servidor.");
        return;
    }

    const { error } = await supabase.from('registros_estudos').update(updatedRecord).eq('id', updatedRecord.id);
    if (error) { 
        alert("Erro ao salvar online."); 
        if (session?.user?.id) fetchData(session.user.id); 
    }
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
      <p className="text-slate-600 text-[10px] animate-pulse">Sincronizando sessão...</p>
    </div>
  );

  if (needsConfig) return <ConfigScreen initialError={!isConfigured ? "Ambiente não configurado." : "Sessão expirada."} />;

  if (!session) return <Login />;
  
  if (showOnboarding && !dataLoading && !isOfflineMode) return <Onboarding onSelectTemplate={handleTemplateSelection} userEmail={session.user.email ?? ''} />;

  const renderView = () => {
    switch (activeView) {
      case 'HOME': case 'DASHBOARD': return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
      case 'FLASHCARDS': return <Flashcards missaoAtiva={missaoAtiva} editais={editais} />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => session?.user?.id && fetchData(session.user.id)} />;
      case 'REVISOES': return <Revisoes records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onUpdated={() => session?.user?.id && fetchData(session.user.id)} />;
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onRecordDelete={handleRecordDelete} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onGroupDelete={handleMultipleRecordDelete} setActiveView={setActiveView} />;
      case 'REGISTRAR_SIMULADO': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => { session?.user?.id && fetchData(session.user.id); setActiveView('SIMULADOS'); }} isSimulado={true} onCancel={() => setActiveView('SIMULADOS')} />;
      case 'RELATORIOS': return <Reports records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'CONFIGURAR': return <Configurar editais={editais} missaoAtiva={missaoAtiva} onUpdated={() => fetchData(session!.user.id)} setMissaoAtiva={setMissaoAtiva} />;
      default: return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
    }
  };

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} userEmail={session.user.email ?? ''} onLogout={() => (supabase.auth as any).signOut()} missaoAtiva={missaoAtiva}>
      {dataLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse z-[60]" />}
      
      {/* BANNER DE MODO OFFLINE (AMARELO) - Permite uso */}
      {isOfflineMode && !isError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl mb-6 flex items-center justify-between gap-4 text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
                <Database size={16} />
                <span>Modo Offline (Visualização).</span>
                <span className="hidden md:inline font-normal opacity-70">Exibindo dados salvos no dispositivo.</span>
            </div>
            <button 
                onClick={() => session?.user?.id && fetchData(session.user.id)} 
                className="underline hover:text-white"
            >
                Tentar Conectar
            </button>
        </div>
      )}

      {/* BANNER DE ERRO CRÍTICO (VERMELHO) - Só aparece se não tiver cache */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-full animate-pulse">
                    <WifiOff size={20} />
                </div>
                <div className="flex flex-col">
                    <span>Falha na Conexão.</span>
                    <span className="text-[10px] opacity-70 font-normal">Não foi possível baixar seus dados e não há cópia local.</span>
                </div>
            </div>
            <button 
                onClick={() => session?.user?.id && fetchData(session.user.id)} 
                className="md:ml-auto flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-all active:scale-95"
            >
                <RefreshCw size={14} /> Tentar Novamente
            </button>
        </div>
      )}
      
      {!isError && renderView()}
    </Layout>
  );
};

export default App;
