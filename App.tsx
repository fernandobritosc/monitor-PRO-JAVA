
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './services/supabase';
import { ViewType, StudyRecord, EditalMateria } from './types';
import Layout from './components/Layout';
import { 
  Login, 
  HomeView, 
  StudyForm, 
  Dashboard, 
  History, 
  Revisoes, 
  Simulados, 
  Configurar, 
  WeeklyGuide, 
  QuestionsBank, 
  ConfigScreen,
  Reports 
} from './views';
import { RefreshCw, Lock, AlertOctagon, WifiOff, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true); 
  const [dataLoading, setDataLoading] = useState(false);
  
  const [isOffline, setIsOffline] = useState(false);
  const [isConfigMisconfigured, setIsConfigMisconfigured] = useState(false);
  const [manualConfigMode, setManualConfigMode] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  
  // Dados
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [isAccessLocked, setIsAccessLocked] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Ref para evitar chamadas duplicadas
  const isFetchingRef = useRef(false);

  // Gamificação
  const gamificationStats = useMemo(() => {
    const minutesXP = studyRecords.reduce((acc, r) => acc + r.tempo, 0);
    const questionsXP = studyRecords.reduce((acc, r) => acc + (r.total * 2), 0);
    const totalXP = minutesXP + questionsXP;
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    const progress = Math.min(( (totalXP - (Math.pow(level - 1, 2) * 100)) / ((Math.pow(level, 2) * 100) - (Math.pow(level - 1, 2) * 100)) ) * 100, 100);
    return { totalXP, level, progress: isNaN(progress) ? 0 : progress };
  }, [studyRecords]);

  // Função central de dados blindada
  const fetchData = useCallback(async (currentSession: any) => {
    if (!currentSession?.user?.id) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setDataLoading(true);
    setFetchError(null);

    try {
      const userId = currentSession.user.id;

      // 1. Profile (Acesso)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
         if (profileError.message.includes('Invalid API key')) throw profileError;
      }

      if (profile && profile.approved === false) {
        setIsAccessLocked(true);
        isFetchingRef.current = false;
        setDataLoading(false);
        return; 
      }
      setIsAccessLocked(false);

      // 2. Editais e Registros
      const [editaisResult, recordsResult] = await Promise.allSettled([
        supabase.from('editais_materias').select('*').eq('user_id', userId),
        supabase.from('registros_estudos').select('*').eq('user_id', userId).order('data_estudo', { ascending: false })
      ]);

      // Processa Editais
      if (editaisResult.status === 'fulfilled' && editaisResult.value.data) {
        const edData = editaisResult.value.data;
        if (edData.length > 0) {
          setEditais(edData);
          setMissaoAtiva((prev: string) => {
             if (prev && edData.some((e: any) => e.concurso === prev)) return prev;
             const principal = edData.find((e: any) => e.is_principal);
             return principal ? principal.concurso : edData[0].concurso;
          });
        } else {
          setEditais([]);
        }
      }

      // Processa Registros
      if (recordsResult.status === 'fulfilled' && recordsResult.value.data) {
        setStudyRecords(recordsResult.value.data);
      }

      setIsOffline(false);
      setIsConfigMisconfigured(false);

    } catch (err: any) {
      console.error("Fetch Data Error:", err);
      
      if (err.message?.includes('Invalid API key') || err.code === 401 || err.code === 'PGRST301') {
        setIsConfigMisconfigured(true);
        setConfigError("Chave de API inválida detectada. Verifique as variáveis de ambiente na Vercel.");
      } else if (err.message?.includes('fetch') || err.message?.includes('AbortError')) {
        setIsOffline(true);
      } else {
        setFetchError(err.message);
      }
    } finally {
      isFetchingRef.current = false;
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
         // Tenta recuperar sessão existente
         const { data, error } = await supabase.auth.getSession();
         
         if (error) {
             console.error("Erro na sessão:", error);
             if (error.message?.includes('Invalid API key')) {
                 if (mounted) {
                     setConfigError("Configuração Inválida. Verifique suas chaves.");
                     setIsConfigMisconfigured(true);
                     setAuthChecking(false);
                 }
                 return;
             }
         }

         if (mounted) {
            if (data?.session) {
                setSession(data.session);
                fetchData(data.session);
            }
            // Importante: Apenas marca como 'verificado' após o getSession retornar
            setAuthChecking(false);
         }
      } catch (e: any) {
         console.error("Exceção na inicialização:", e);
         if (mounted) setAuthChecking(false);
      }
    };

    init();

    // Listener para mudanças de auth (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            setSession(newSession);
            setAuthChecking(false);
            if (newSession) fetchData(newSession);
        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setStudyRecords([]);
            setEditais([]);
            setAuthChecking(false);
        }
    });

    return () => { 
        mounted = false;
        subscription.unsubscribe();
    };
  }, [fetchData]);

  // --- RENDERS ---

  if (isConfigMisconfigured || manualConfigMode) {
    return <ConfigScreen initialError={configError} />;
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-purple-500/10 rounded-full"></div>
          <div className="absolute top-0 w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
           <h1 className="text-white font-black text-2xl tracking-tighter mb-2">MONITORPRO</h1>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
             Conectando ao banco de dados...
           </p>
        </div>
      </div>
    );
  }
  
  if (!session) return <Login onConfigClick={() => setManualConfigMode(true)} />;

  if (isAccessLocked) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center p-6 text-center">
        <div className="glass max-w-md w-full p-10 rounded-3xl border border-yellow-500/20 space-y-6">
           <Lock size={48} className="text-yellow-500 mx-auto" />
           <h1 className="text-2xl font-bold text-white">Acesso Pendente</h1>
           <p className="text-slate-400 text-sm">Aguarde a aprovação do administrador.</p>
           <button onClick={() => window.location.reload()} className="bg-slate-800 py-3 w-full rounded-xl font-bold text-white flex items-center justify-center gap-2">
              <RefreshCw size={16} /> Atualizar
           </button>
           <button onClick={() => supabase.auth.signOut()} className="text-red-400 font-bold text-sm hover:underline">Sair</button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'HOME': return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => fetchData(session)} />;
      case 'DASHBOARD': return <Dashboard records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'REVISOES': return <Revisoes records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onUpdated={() => fetchData(session)} />;
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onUpdated={() => fetchData(session)} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onSaved={() => fetchData(session)} setActiveView={setActiveView} />;
      case 'REGISTRAR_SIMULADO': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => { fetchData(session); setActiveView('SIMULADOS'); }} isSimulado={true} onCancel={() => setActiveView('SIMULADOS')} />;
      case 'RELATORIOS': return <Reports records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'CONFIGURAR': return <Configurar 
          editais={editais} 
          missaoAtiva={missaoAtiva} 
          onUpdated={async () => {
             const { data } = await supabase.auth.getSession();
             if (data.session) await fetchData(data.session);
          }} 
          setMissaoAtiva={setMissaoAtiva} 
      />;
      default: return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
    }
  };

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      userEmail={session.user.email} 
      onLogout={() => supabase.auth.signOut()}
      missaoAtiva={missaoAtiva}
      xp={gamificationStats.totalXP}
      level={gamificationStats.level}
      progressToNextLevel={gamificationStats.progress}
    >
      {dataLoading && (
         <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse z-[60]" />
      )}

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold animate-in fade-in">
           <div className="flex items-center gap-2">
             <AlertOctagon size={20} className="shrink-0" /> 
             <span>Erro de sincronização: {fetchError}</span>
           </div>
           <button onClick={() => fetchData(session)} className="md:ml-auto bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-colors text-xs uppercase tracking-wider">
             Tentar Novamente
           </button>
        </div>
      )}
      {isOffline && (
         <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold animate-in fade-in shadow-lg shadow-yellow-500/5">
           <div className="flex items-center gap-2">
             <WifiOff size={20} className="shrink-0" /> 
             <span>Conexão instável. Tentando reconectar...</span>
           </div>
           <button onClick={() => fetchData(session)} className="md:ml-auto flex items-center gap-2 hover:text-white">
             <Loader2 size={14} className={dataLoading ? "animate-spin" : ""} /> Reconectar
           </button>
        </div>
      )}
      {renderView()}
    </Layout>
  );
};

export default App;
