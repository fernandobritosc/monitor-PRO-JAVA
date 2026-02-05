
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

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConfig, setNeedsConfig] = useState(!isConfigured);
  const [isOffline, setIsOffline] = useState(false);

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

  // --- GERENCIAMENTO DE SESSÃO ROBUSTO (v1.0.18) ---
  useEffect(() => {
    if (!isConfigured) {
      setNeedsConfig(true);
      setLoading(false);
      return;
    }

    let mounted = true;

    // Inicialização da Sessão com Fallback
    const initializeSession = async () => {
      try {
        // 1. Tenta recuperar sessão ativa do cliente Supabase
        const { data: { session: initialSession }, error } = await (supabase.auth as any).getSession();
        
        if (!mounted) return;

        if (initialSession) {
          console.log("✅ Sessão recuperada via getSession");
          setSession(initialSession);
          setLoading(false); 
        } else {
           // 2. Fallback: Se não tem sessão, mas tem token no storage, força refresh
           const localToken = localStorage.getItem('monitorpro-auth-token');
           if (localToken) {
               console.log("🔄 Token encontrado. Tentando refreshSession forçado...");
               const { data: { session: refreshedSession }, error: refreshError } = await (supabase.auth as any).refreshSession();
               
               if (refreshedSession && !refreshError) {
                   console.log("✅ Sessão renovada com sucesso.");
                   setSession(refreshedSession);
                   setLoading(false);
               } else {
                   console.warn("⚠️ Falha ao renovar sessão. Token inválido/expirado.", refreshError);
                   localStorage.removeItem('monitorpro-auth-token'); // Limpa token ruim
                   setSession(null);
                   setLoading(false);
               }
           } else {
               console.log("ℹ️ Sem sessão e sem token. Redirecionando para Login.");
               setSession(null);
               setLoading(false);
           }
        }
      } catch (error) {
        console.error("❌ Erro crítico ao verificar sessão:", error);
        // Em caso de erro de rede, não limpamos o token imediatamente para permitir retry
        // mas paramos o loading para não travar a UI
        setLoading(false);
      }
    };

    initializeSession();

    // Listener para mudanças de auth (Login, Logout, Refresh auto)
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: string, newSession: any) => {
      console.log("Auth Event:", _event);
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

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    if (session?.user?.id) {
      fetchData(session.user.id);
    } else if (!session && !loading) {
       // Limpeza apenas se tiver certeza que não está logado
       setEditais([]);
       setStudyRecords([]);
       setMissaoAtiva('');
       setShowOnboarding(false);
    }
  }, [session?.user?.id]); 

  const fetchData = async (userId: string) => {
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

  // Se estiver carregando, mostra spinner e NÃO redireciona
  if (loading) return (
    <div className="min-h-screen bg-[#12151D] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">MonitorPro v{__APP_VERSION__}</p>
      <p className="text-slate-600 text-[10px] animate-pulse">Sincronizando sessão...</p>
    </div>
  );

  if (needsConfig) return <ConfigScreen initialError={!isConfigured ? "Ambiente não configurado." : "Sessão expirada."} />;

  // Só mostra login se NÃO estiver carregando e NÃO tiver sessão
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
    <Layout activeView={activeView} setActiveView={setActiveView} userEmail={session.user.email ?? ''} onLogout={() => (supabase.auth as any).signOut()} missaoAtiva={missaoAtiva}>
      {dataLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse z-[60]" />}
      {isOffline && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 text-sm font-bold shadow-lg"><div className="flex items-center gap-2"><WifiOff size={20} /> <span>API Indisponível.</span></div><button onClick={() => session?.user?.id && fetchData(session.user.id)} className="md:ml-auto underline">Tentar Reconectar</button></div>}
      {renderView()}
    </Layout>
  );
};

export default App;
