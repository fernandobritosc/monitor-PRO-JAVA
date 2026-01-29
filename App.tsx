
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
  Reports,
  Onboarding 
} from './views';
import { RefreshCw, Lock, AlertOctagon, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true); 
  const [dataLoading, setDataLoading] = useState(false);
  
  const [isOffline, setIsOffline] = useState(false);
  const [isConfigMisconfigured, setIsConfigMisconfigured] = useState(false);
  const [manualConfigMode, setManualConfigMode] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Controle de Fluxo
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Dados
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [isAccessLocked, setIsAccessLocked] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Estado específico para feedback de verificação manual
  const [verifyingAccess, setVerifyingAccess] = useState(false);

  // Ref para evitar chamadas duplicadas
  const isFetchingRef = useRef(false);

  // Verificação de URL placeholder (Chaves não configuradas)
  useEffect(() => {
    // @ts-ignore - Acessando propriedade interna para verificação
    const currentUrl = supabase.supabaseUrl || '';
    if (currentUrl.includes('placeholder')) {
      setIsConfigMisconfigured(true);
      setConfigError("Chaves de API não detectadas. Configure as variáveis na Vercel ou use a configuração manual.");
      setAuthChecking(false);
    }
  }, []);

  // Gamificação
  const gamificationStats = useMemo(() => {
    const minutesXP = studyRecords.reduce((acc, r) => acc + r.tempo, 0);
    const questionsXP = studyRecords.reduce((acc, r) => acc + (r.total * 2), 0);
    const totalXP = minutesXP + questionsXP;
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    const progress = Math.min(( (totalXP - (Math.pow(level - 1, 2) * 100)) / ((Math.pow(level, 2) * 100) - (Math.pow(level - 1, 2) * 100)) ) * 100, 100);
    return { totalXP, level, progress: isNaN(progress) ? 0 : progress };
  }, [studyRecords]);

  // Função chamada pelo Onboarding para salvar o edital escolhido
  const handleTemplateSelection = async (templateData: any[]) => {
     if (!session?.user?.id) return;
     
     try {
        const payload = templateData.map(t => ({
           ...t,
           user_id: session.user.id
        }));

        const { error } = await supabase.from('editais_materias').insert(payload);
        if (error) throw error;
        
        // Atualiza a tela
        await fetchData(session);
        setShowOnboarding(false);

     } catch (err: any) {
        console.error("Erro ao salvar template:", err);
        alert("Erro ao configurar edital: " + err.message);
     }
  };

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
          setShowOnboarding(false);
        } else {
          setEditais([]);
          // SE NÃO TEM EDITAIS, ATIVA O MODO ONBOARDING (SELEÇÃO DE MODELO)
          setShowOnboarding(true);
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

  // Listener de Auth Robusto (Corrige o bug de refresh)
  useEffect(() => {
    let mounted = true;

    // Timeout de segurança: Se o Supabase não responder em 5s, libera a UI para Login
    const safetyTimeout = setTimeout(() => {
       if (mounted && authChecking) {
          console.warn("Auth timeout - liberando interface");
          setAuthChecking(false);
       }
    }, 5000);

    // A. Check manual imediato (Resolve F5)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
       if (mounted && currentSession) {
          console.log("Sessão recuperada manualmente");
          setSession(currentSession);
          fetchData(currentSession);
          setAuthChecking(false); // Garante liberação rápida se já tiver sessão
          clearTimeout(safetyTimeout);
       }
    }).catch(err => {
        console.error("Erro no getSession manual:", err);
        if (mounted) setAuthChecking(false);
    });

    // B. Listener de Eventos (Resolve Login/Logout/Token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!mounted) return;
        
        console.log("Auth Event:", event);

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setSession(newSession);
            setAuthChecking(false);
            clearTimeout(safetyTimeout);
            if (newSession) fetchData(newSession);
        } 
        else if (event === 'SIGNED_OUT') {
            setSession(null);
            setStudyRecords([]);
            setEditais([]);
            setAuthChecking(false);
            clearTimeout(safetyTimeout);
        }
    });

    return () => { 
        mounted = false;
        subscription.unsubscribe();
        clearTimeout(safetyTimeout);
    };
  }, [fetchData]);

  // Listener de Aprovação em Tempo Real
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        async (payload: any) => {
          if (payload.new && payload.new.approved === true) {
             console.log("Aprovação realtime detectada!");
             await fetchData(session);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchData]);

  const handleCheckAccess = async () => {
     if (!session) return;
     setVerifyingAccess(true);
     await fetchData(session);
     setTimeout(() => setVerifyingAccess(false), 800);
  };

  // --- RENDERS ---

  if (isConfigMisconfigured || manualConfigMode) {
    return <ConfigScreen initialError={configError} />;
  }

  // TELA DE CARREGAMENTO
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
             Verificando credenciais...
           </p>
        </div>
      </div>
    );
  }
  
  // Se parou de checar e não tem sessão, aí sim mostra o Login
  if (!session) return <Login onConfigClick={() => setManualConfigMode(true)} />;

  if (isAccessLocked) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center p-6 text-center">
        <div className="glass max-w-md w-full p-10 rounded-3xl border border-yellow-500/20 space-y-6 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-pulse"></div>
           <Lock size={48} className="text-yellow-500 mx-auto" />
           <div>
             <h1 className="text-2xl font-bold text-white mb-2">Acesso Pendente</h1>
             <p className="text-slate-400 text-sm">
               Sua conta foi criada, mas precisa da aprovação do administrador para acessar o sistema.
             </p>
           </div>
           <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl text-xs text-yellow-200/70">
              Não se preocupe! Assim que o admin aprovar, esta tela desbloqueará automaticamente.
           </div>
           <button 
              onClick={handleCheckAccess} 
              disabled={verifyingAccess}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all py-3 w-full rounded-xl font-bold text-white flex items-center justify-center gap-2"
           >
              {verifyingAccess ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
              {verifyingAccess ? 'Verificando...' : 'Verificar Agora'}
           </button>
           <button onClick={() => supabase.auth.signOut()} className="text-red-400 font-bold text-sm hover:underline">Sair / Trocar Conta</button>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
     return <Onboarding onSelectTemplate={handleTemplateSelection} userEmail={session.user.email} />;
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
