
export { default as Login } from './Login';
export { default as HomeView } from './HomeView';
export { default as StudyForm } from './StudyForm';
export { default as Dashboard } from './Dashboard';
export { default as History } from './History';
export { default as Revisoes } from './Revisoes';
export { default as Simulados } from './Simulados';
export { default as Configurar } from './Configurar';
export { default as WeeklyGuide } from './WeeklyGuide';
export { default as QuestionsBank } from './QuestionsBank';
// export { default as ConfigScreen } from './ConfigScreen'; // Removido
export { default as Reports } from './Reports';
export { default as Onboarding } from './Onboarding';
export { default as EditalProgress } from './EditalProgress';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './services/supabase';
import { ViewType, StudyRecord, EditalMateria } from './types';
import Layout from './components/Layout';
import { 
  Login, 
  HomeView, 
  StudyForm, 
  // Dashboard, // Removido
  History, 
  Revisoes, 
  Simulados, 
  Configurar, 
  WeeklyGuide, 
  QuestionsBank, 
  Reports,
  Onboarding,
  EditalProgress
} from './views';
import { WifiOff, Loader2, AlertOctagon } from 'lucide-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js'; // Importar Session e AuthChangeEvent

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null); // Tipagem explícita para Session | null
  const [loading, setLoading] = useState(true);
  
  // Controle de Erros
  const [isOffline, setIsOffline] = useState(false);
  
  // Controle de Fluxo
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Dados do Usuário
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getSession' property.
    // Tipagem explícita para o objeto data para resolver TS7031
    (supabase.auth as any).getSession().then(({ data: { session: currentSession } }: { data: { session: Session | null } }) => {
      setSession(currentSession);
      if (currentSession) fetchData(currentSession.user.id);
      setLoading(false);
    });

    // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'onAuthStateChange' property.
    // Tipagem explícita para _event e session
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setEditais([]);
        setStudyRecords([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setDataLoading(true);
    setIsOffline(false);
    try {
      const [editaisRes, recordsRes] = await Promise.all([
        supabase.from('editais_materias').select('*').eq('user_id', userId),
        supabase.from('registros_estudos').select('*').eq('user_id', userId).order('data_estudo', { ascending: false })
      ]);

      if (editaisRes.error) throw editaisRes.error;
      if (recordsRes.error) throw recordsRes.error;

      const loadedEditais = editaisRes.data || [];
      setEditais(loadedEditais);

      if (loadedEditais.length > 0) {
        setMissaoAtiva(prev => {
           if (prev && loadedEditais.some((e: any) => e.concurso === prev)) return prev;
           const principal = loadedEditais.find((e: any) => e.is_principal);
           return principal ? principal.concurso : loadedEditais[0].concurso;
        });
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }

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
        alert("Erro ao salvar template: " + err.message);
     }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#12151D] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Carregando Sistema...</p>
    </div>
  );

  if (!session) return <Login />;
  if (showOnboarding) return <Onboarding onSelectTemplate={handleTemplateSelection} userEmail={session.user.email ?? ''} />;

  const renderView = () => {
    switch (activeView) {
      case 'HOME':
      case 'DASHBOARD': // Unificado
        return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => fetchData(session.user.id)} />;
      case 'REVISOES': return <Revisoes records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onUpdated={() => fetchData(session.user.id)} />;
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onUpdated={() => fetchData(session.user.id)} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onSaved={() => fetchData(session.user.id)} setActiveView={setActiveView} />;
      case 'REGISTRAR_SIMULADO': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => { fetchData(session.user.id); setActiveView('SIMULADOS'); }} isSimulado={true} onCancel={() => setActiveView('SIMULADOS')} />;
      case 'RELATORIOS': return <Reports records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'CONFIGURAR': return <Configurar editais={editais} missaoAtiva={missaoAtiva} onUpdated={() => fetchData(session.user.id)} setMissaoAtiva={setMissaoAtiva} />;
      default: return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
    }
  };

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      userEmail={session.user.email ?? ''} 
      onLogout={() => (supabase.auth as any).signOut()}
      missaoAtiva={missaoAtiva}
    >
      {dataLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse z-[60]" />}
      {isOffline && (
         <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold animate-in fade-in shadow-lg shadow-yellow-500/5">
           <div className="flex items-center gap-2">
             <WifiOff size={20} className="shrink-0" /> 
             <span>Conexão instável.</span>
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
