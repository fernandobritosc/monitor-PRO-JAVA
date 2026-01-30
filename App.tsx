
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Onboarding,
  EditalProgress
} from './views';
import { WifiOff, Loader2, AlertOctagon } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Controle de Erros e Configuração
  const [isOffline, setIsOffline] = useState(false);
  const [manualConfigMode, setManualConfigMode] = useState(false);
  
  // Controle de Fluxo
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Dados do Usuário
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // --- 1. GERENCIAMENTO DE SESSÃO SIMPLIFICADO ---
  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(session.user.id);
      setLoading(false);
    });

    // Escuta mudanças (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        // Limpa dados ao sair
        setEditais([]);
        setStudyRecords([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. BUSCA DE DADOS (SEM TRAVAS DE PERMISSÃO) ---
  const fetchData = async (userId: string) => {
    setDataLoading(true);
    setIsOffline(false);
    try {
      // Busca Editais e Registros em paralelo
      const [editaisRes, recordsRes] = await Promise.all([
        supabase.from('editais_materias').select('*').eq('user_id', userId),
        supabase.from('registros_estudos').select('*').eq('user_id', userId).order('data_estudo', { ascending: false })
      ]);

      if (editaisRes.error) throw editaisRes.error;
      if (recordsRes.error) throw recordsRes.error;

      // Configura Editais
      const loadedEditais = editaisRes.data || [];
      setEditais(loadedEditais);

      if (loadedEditais.length > 0) {
        // Tenta manter a missão ativa ou pega a principal
        setMissaoAtiva(prev => {
           if (prev && loadedEditais.some((e: any) => e.concurso === prev)) return prev;
           const principal = loadedEditais.find((e: any) => e.is_principal);
           return principal ? principal.concurso : loadedEditais[0].concurso;
        });
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }

      // Configura Registros
      setStudyRecords(recordsRes.data || []);

    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
         setIsOffline(true);
      }
    } finally {
      setDataLoading(false);
    }
  };

  // Gamificação Simples
  const gamificationStats = useMemo(() => {
    const minutesXP = studyRecords.reduce((acc, r) => acc + r.tempo, 0);
    const questionsXP = studyRecords.reduce((acc, r) => acc + (r.total * 2), 0);
    const totalXP = minutesXP + questionsXP;
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    const progress = Math.min(( (totalXP - (Math.pow(level - 1, 2) * 100)) / ((Math.pow(level, 2) * 100) - (Math.pow(level - 1, 2) * 100)) ) * 100, 100);
    return { totalXP, level, progress: isNaN(progress) ? 0 : progress };
  }, [studyRecords]);

  // Handler de Onboarding
  const handleTemplateSelection = async (templateData: any[]) => {
     if (!session?.user?.id) return;
     try {
        const payload = templateData.map(t => ({ ...t, user_id: session.user.id }));
        
        // Mudança crítica: UPSERT em vez de INSERT para lidar com duplicatas
        const { error } = await supabase.from('editais_materias').upsert(payload, { 
            onConflict: 'user_id,concurso,materia',
            ignoreDuplicates: true 
        });

        if (error) throw error;
        await fetchData(session.user.id);
        setShowOnboarding(false);
     } catch (err: any) {
        alert("Erro ao salvar template: " + err.message);
     }
  };

  // --- RENDERIZAÇÃO ---

  if (manualConfigMode) {
    return <ConfigScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Carregando Sistema...</p>
      </div>
    );
  }

  if (!session) {
    return <Login onConfigClick={() => setManualConfigMode(true)} />;
  }

  if (showOnboarding) {
     return <Onboarding onSelectTemplate={handleTemplateSelection} userEmail={session.user.email} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'HOME': return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => fetchData(session.user.id)} />;
      case 'DASHBOARD': return <Dashboard records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'REVISOES': return <Revisoes records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onUpdated={() => fetchData(session.user.id)} />;
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onUpdated={() => fetchData(session.user.id)} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onSaved={() => fetchData(session.user.id)} setActiveView={setActiveView} />;
      case 'REGISTRAR_SIMULADO': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => { fetchData(session.user.id); setActiveView('SIMULADOS'); }} isSimulado={true} onCancel={() => setActiveView('SIMULADOS')} />;
      case 'RELATORIOS': return <Reports records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'CONFIGURAR': return <Configurar 
          editais={editais} 
          missaoAtiva={missaoAtiva} 
          onUpdated={() => fetchData(session.user.id)} 
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
      
      {isOffline && (
         <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold animate-in fade-in shadow-lg shadow-yellow-500/5">
           <div className="flex items-center gap-2">
             <WifiOff size={20} className="shrink-0" /> 
             <span>Conexão instável. Tentando reconectar...</span>
           </div>
           <button onClick={() => fetchData(session.user.id)} className="md:ml-auto flex items-center gap-2 hover:text-white">
             <Loader2 size={14} className={dataLoading ? "animate-spin" : ""} /> Reconectar
           </button>
        </div>
      )}

      {renderView()}
    </Layout>
  );
};

export default App;
