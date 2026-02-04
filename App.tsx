
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
import { WifiOff, Loader2 } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConfig, setNeedsConfig] = useState(!isConfigured);
  const [isOffline, setIsOffline] = useState(false);

  // PERSISTÊNCIA DE VIEW: Recupera a última tela acessada ou vai para HOME
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

  // Efeito 0: Salvar a View sempre que mudar
  useEffect(() => {
    if (activeView) {
      localStorage.setItem('monitorpro_last_view', activeView);
    }
  }, [activeView]);

  // Efeito 1: Gerenciamento de Sessão Simplificado
  useEffect(() => {
    if (!isConfigured) {
      setNeedsConfig(true);
      setLoading(false);
      return;
    }

    let mounted = true;

    // Função principal de verificação
    const checkSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
          }
          // Só define loading como false após a verificação inicial completa
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listener de Eventos de Autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        // Se recebermos um evento, garantimos que o loading pare
        setLoading(false);

        if (_event === 'SIGNED_OUT') {
           setSession(null);
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

  // Efeito 2: Carregamento de Dados (só roda se tiver usuário)
  useEffect(() => {
    if (session?.user?.id) {
      fetchData(session.user.id);
    } else if (!loading && !session) {
      // Limpa dados se não houver sessão e não estiver carregando
      setEditais([]);
      setStudyRecords([]);
      setMissaoAtiva('');
      setShowOnboarding(false);
    }
  }, [session?.user?.id]); // Removido 'loading' da dependência para evitar loops

  const fetchData = async (userId: string) => {
    // Evita loading visual se já tiver dados e for apenas um refresh silencioso
    if (editais.length === 0) setDataLoading(true);
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
           // Se já tem uma missão ativa e ela ainda existe, mantém
           if (prev && loadedEditais.some((e: any) => e.concurso === prev)) return prev;
           // Senão pega a principal ou a primeira
           const principal = loadedEditais.find((e: any) => e.is_principal);
           return principal ? principal.concurso : loadedEditais[0].concurso;
        });
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }

      setStudyRecords(recordsRes.data || []);

    } catch (error: any) {
      console.error("Erro dados:", error);
      setIsOffline(true);
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
        alert(err.message?.includes('constraint') ? "Algumas matérias já existiam." : "Erro: " + err.message);
     }
  };

  const handleRecordUpdate = async (updatedRecord: StudyRecord) => {
    setStudyRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    const { error } = await supabase.from('registros_estudos').update(updatedRecord).eq('id', updatedRecord.id);
    if (error) { alert("Erro ao salvar."); if (session?.user?.id) fetchData(session.user.id); }
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
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Carregando MonitorPro...</p>
    </div>
  );

  if (needsConfig) return <ConfigScreen initialError={!isConfigured ? "Ambiente não configurado." : "Sessão expirada."} />;

  if (!session) return <Login />;
  
  if (showOnboarding && !dataLoading) return <Onboarding onSelectTemplate={handleTemplateSelection} userEmail={session.user.email ?? ''} />;

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
    <Layout activeView={activeView} setActiveView={setActiveView} userEmail={session.user.email ?? ''} onLogout={() => supabase.auth.signOut()} missaoAtiva={missaoAtiva}>
      {dataLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse z-[60]" />}
      {isOffline && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold shadow-lg"><div className="flex items-center gap-2"><WifiOff size={20} /> <span>API Indisponível.</span></div><button onClick={() => session?.user?.id && fetchData(session.user.id)} className="md:ml-auto underline">Tentar Reconectar</button></div>}
      {renderView()}
    </Layout>
  );
};

export default App;
