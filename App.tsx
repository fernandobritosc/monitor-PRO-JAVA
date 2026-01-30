import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './services/supabase';
import { ViewType, StudyRecord, EditalMateria } from './types';
import Layout from './components/Layout';
import Login from './views/Login';
import HomeView from './views/HomeView';
import StudyForm from './views/StudyForm';
import History from './views/History';
import Revisoes from './views/Revisoes';
import Simulados from './views/Simulados';
import Configurar from './views/Configurar';
import WeeklyGuide from './views/WeeklyGuide';
import QuestionsBank from './views/QuestionsBank';
import Reports from './views/Reports';
import Onboarding from './views/Onboarding';
import EditalProgress from './views/EditalProgress';
import { WifiOff, Loader2, AlertOctagon } from 'lucide-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isOffline, setIsOffline] = useState(false);
  
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    (supabase.auth as any).getSession().then(({ data: { session: currentSession } }: { data: { session: Session | null } }) => {
      setSession(currentSession);
      if (currentSession) fetchData(currentSession.user.id);
      setLoading(false);
    });

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

  const handleRecordUpdate = async (updatedRecord: StudyRecord) => {
    setStudyRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    
    const { error } = await supabase.from('registros_estudos').update(updatedRecord).eq('id', updatedRecord.id);

    if (error) {
        console.error("Falha na atualização otimista:", error);
        alert("Ocorreu um erro ao salvar sua alteração. A tela será sincronizada.");
        if (session) fetchData(session.user.id);
    }
  };

  const handleRecordDelete = async (recordId: string) => {
    const originalRecords = studyRecords;
    setStudyRecords(prev => prev.filter(r => r.id !== recordId));

    const { error } = await supabase.from('registros_estudos').delete().eq('id', recordId);

    if (error) {
        console.error("Falha na deleção otimista:", error);
        alert("Ocorreu um erro ao deletar o registro. A tela será sincronizada.");
        setStudyRecords(originalRecords);
    }
  };

  const handleMultipleRecordDelete = async (recordIds: string[]) => {
    const originalRecords = studyRecords;
    setStudyRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
    const { error } = await supabase.from('registros_estudos').delete().in('id', recordIds);
    if (error) {
        alert("Falha ao excluir registros do simulado.");
        setStudyRecords(originalRecords);
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
      case 'DASHBOARD':
        return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => fetchData(session.user.id)} />;
      case 'REVISOES': {
        return (
          <Revisoes 
            records={studyRecords as StudyRecord[]} 
            missaoAtiva={missaoAtiva as string} 
            editais={editais as EditalMateria[]} 
            onRecordUpdate={handleRecordUpdate as (record: StudyRecord) => void} 
            onUpdated={() => fetchData(session.user.id)} 
          />
        );
      }
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onRecordDelete={handleRecordDelete} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onGroupDelete={handleMultipleRecordDelete} setActiveView={setActiveView} />;
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
  );import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './services/supabase';
import { ViewType, StudyRecord, EditalMateria } from './types';
import Layout from './components/Layout';
import Login from './views/Login';
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
import { WifiOff, Loader2, AlertOctagon } from 'lucide-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isOffline, setIsOffline] = useState(false);
  
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [editais, setEditais] = useState<EditalMateria[]>([]);
  const [missaoAtiva, setMissaoAtiva] = useState<string>('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    (supabase.auth as any).getSession().then(({ data: { session: currentSession } }: { data: { session: Session | null } }) => {
      setSession(currentSession);
      if (currentSession) fetchData(currentSession.user.id);
      setLoading(false);
    });

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

  const handleRecordUpdate = async (updatedRecord: StudyRecord) => {
    setStudyRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    
    const { error } = await supabase.from('registros_estudos').update(updatedRecord).eq('id', updatedRecord.id);

    if (error) {
        console.error("Falha na atualização otimista:", error);
        alert("Ocorreu um erro ao salvar sua alteração. A tela será sincronizada.");
        if (session) fetchData(session.user.id);
    }
  };

  const handleRecordDelete = async (recordId: string) => {
    const originalRecords = studyRecords;
    setStudyRecords(prev => prev.filter(r => r.id !== recordId));

    const { error } = await supabase.from('registros_estudos').delete().eq('id', recordId);

    if (error) {
        console.error("Falha na deleção otimista:", error);
        alert("Ocorreu um erro ao deletar o registro. A tela será sincronizada.");
        setStudyRecords(originalRecords);
    }
  };

  const handleMultipleRecordDelete = async (recordIds: string[]) => {
    const originalRecords = studyRecords;
    setStudyRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
    const { error } = await supabase.from('registros_estudos').delete().in('id', recordIds);
    if (error) {
        alert("Falha ao excluir registros do simulado.");
        setStudyRecords(originalRecords);
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
      case 'DASHBOARD':
        return <HomeView records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} setActiveView={setActiveView} />;
      case 'EDITAL': return <EditalProgress records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} />;
      case 'GUIA_SEMANAL': return <WeeklyGuide records={studyRecords} missaoAtiva={missaoAtiva} />;
      case 'QUESTOES': return <QuestionsBank missaoAtiva={missaoAtiva} editais={editais} />;
      case 'REGISTRAR': return <StudyForm editais={editais} missaoAtiva={missaoAtiva} onSaved={() => fetchData(session.user.id)} />;
      case 'REVISOES': {
        return (
          <Revisoes 
            records={studyRecords as StudyRecord[]} 
            missaoAtiva={missaoAtiva as string} 
            editais={editais as EditalMateria[]} 
            onRecordUpdate={handleRecordUpdate as (record: StudyRecord) => void} 
            onUpdated={() => fetchData(session.user.id)} 
          />
        );
      }
      case 'HISTORICO': return <History records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onRecordDelete={handleRecordDelete} />;
      case 'SIMULADOS': return <Simulados records={studyRecords} missaoAtiva={missaoAtiva} editais={editais} onRecordUpdate={handleRecordUpdate} onGroupDelete={handleMultipleRecordDelete} setActiveView={setActiveView} />;
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
};

export default App;