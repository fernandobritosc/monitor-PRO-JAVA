import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  CheckSquare,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Menu,
  X,
  TrendingUp,
  FileText,
  Clock,
  Sun,
  Moon,
  PlusCircle,
  Activity,
  Target,
  Zap,
  Sparkles,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { preserveMissaoOnClear } from '../utils/localStorage';
import { ViewType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  missaoAtiva: string;
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
  userEmail?: string;
  onLogout?: () => void;
}



const APP_VERSION = '1.0.32';
const BUILD_TIME = typeof __BUILD_TIMESTAMP__ !== 'undefined'
  ? new Date(Number(__BUILD_TIMESTAMP__)).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  : '17/02/2026 23:30';

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, missaoAtiva, theme, toggleTheme, userEmail: propEmail, onLogout: propLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (propEmail) {
      setUserEmail(propEmail);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email || '');
    });
  }, [propEmail]);

  const onLogout = async () => {
    if (propLogout) {
      propLogout();
      return;
    }

    await supabase.auth.signOut();
    preserveMissaoOnClear(); // Usa função utilitária
    window.location.reload();
  };

  interface MenuItem {
    id: string;
    label: string;
    icon: any;
    isNew?: boolean;
  }

  const getMenuItems = (): MenuItem[] => {
    // Basic items always present
    const hubItems = [
      { id: 'HUB', label: 'Início', icon: Home },
      { id: 'CONFIGURAR', label: 'Configurações', icon: Settings },
    ];

    const studyItems = [
      { id: 'DASHBOARD', label: 'Análise de Estudo', icon: TrendingUp },
      { id: 'REGISTRAR', label: 'Registrar Estudo', icon: PlusCircle },
      { id: 'FLASHCARDS', label: 'Flashcard', icon: Zap },
      { id: 'EDITAL', label: 'Edital Vertical', icon: BookOpen },
      { id: 'REVISOES', label: 'Revisões Ativas', icon: Clock },
      { id: 'SIMULADOS', label: 'Simulados', icon: Target },
      { id: 'DISCURSIVA', label: 'IA Discursiva', icon: FileText, isNew: true },
      { id: 'GABARITO_IA', label: 'Gabarito IA', icon: Sparkles },
      { id: 'ANALISE_ERROS', label: 'Analise de Performace', icon: Activity },
      { id: 'RELATORIOS', label: 'Relatórios Pro', icon: TrendingUp },
      { id: 'HISTORICO', label: 'Histórico', icon: Activity },
    ];

    const questionItems = [
      { id: 'QUESTOES', label: 'Banco de Questões', icon: CheckSquare },
      { id: 'CADASTRO_QUESTOES', label: 'Gerenciar Banco', icon: PlusCircle },
    ];

    // Determine current context
    const isStudyModule = [
      'DASHBOARD', 'HOME', 'REGISTRAR', 'EDITAL', 'REVISOES',
      'HISTORICO', 'SIMULADOS', 'FLASHCARDS', 'DISCURSIVA',
      'GABARITO_IA', 'ANALISE_ERROS', 'RELATORIOS'
    ].includes(activeView);

    const isQuestionModule = ['QUESTOES', 'CADASTRO_QUESTOES'].includes(activeView);

    if (activeView === 'HUB') {
      return [...hubItems, ...questionItems]; // Show Hub + Quick Links to Questões
    }

    if (isStudyModule) {
      return [
        { id: 'HUB', label: 'Voltar ao Início', icon: Home },
        ...studyItems,
        { id: 'CONFIGURAR', label: 'Configurações', icon: Settings },
      ];
    }

    if (isQuestionModule) {
      return [
        { id: 'HUB', label: 'Voltar ao Início', icon: Home },
        ...questionItems,
        { id: 'PERFORMANCE', label: 'Performance Alpha', icon: Trophy },
        { id: 'CONFIGURAR', label: 'Configurações', icon: Settings },
      ];
    }

    return [...hubItems, ...questionItems];
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex min-h-screen bg-[hsl(var(--bg-main))] relative">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Explicit Conditional Rendering */}
      {activeView === 'HUB' ? null : (
        <motion.aside
          initial={false}
          animate={{
            width: isCollapsed ? 64 : 240,
            x: sidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : -240
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 } as any}
          className={`
            fixed lg:sticky top-0 left-0 h-screen 
            bg-[hsl(var(--bg-sidebar)/0.8)] backdrop-blur-[var(--glass-blur)]
            border-r border-[hsl(var(--border))]
            z-[70] flex flex-col
          `}
        >
          {/* ... sidebar content ... */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-8 bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] text-[hsl(var(--accent))] p-1.5 rounded-full hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] transition-all z-[80]"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className="p-3 shrink-0 flex items-center justify-between">
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${isCollapsed ? 'lg:opacity-0' : 'opacity-100'}`}>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-secondary))] flex items-center justify-center text-sm">
                🎯
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter text-[hsl(var(--text-bright))] leading-none">
                  MONITOR<span className="text-[hsl(var(--accent))]">PRO</span>
                </h1>
                <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))] mt-0.5">SISTEMA INTELIGENTE</p>
              </div>
            </div>
          </div>

          <motion.div
            layout
            className={`bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-xl mx-2 mb-4 shrink-0 transition-all duration-300 ${isCollapsed ? 'p-1' : 'p-2'}`}>
            <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-lg bg-[hsl(var(--bg-main))] flex items-center justify-center text-[hsl(var(--accent))] border border-[hsl(var(--border))] shrink-0 shadow-sm">
                <User size={14} />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[hsl(var(--text-bright))] text-[9px] truncate uppercase tracking-tight">{userEmail.split('@')[0]}</div>
                  <div className="text-[7px] text-[hsl(var(--accent))] uppercase tracking-widest font-bold opacity-70">Perfil Pro</div>
                </div>
              )}
            </div>
          </motion.div>

          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id as ViewType); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2 rounded-lg transition-all duration-300 text-[11px] group relative overflow-hidden ${isCollapsed ? 'justify-center p-2' : 'px-3 py-1.5'} ${isActive ? 'bg-[hsl(var(--accent-glow))] text-[hsl(var(--accent))] shadow-[inset_0_0_20px_hsl(var(--accent)/0.05)]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-[hsl(var(--bg-user-block))]'}`}
                >
                  <Icon size={14} className={`${isActive ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--accent))]'} transition-colors shrink-0`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex justify-between items-center">
                      <span className={`truncate text-left font-bold tracking-tight ${isActive ? 'text-[hsl(var(--text-bright))]' : 'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-2 shrink-0 space-y-1 pb-4 px-3">
            <button onClick={toggleTheme} className={`flex items-center gap-2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--bg-user-block))] rounded-lg transition-all text-[11px] w-full ${isCollapsed ? 'justify-center p-2' : 'px-3 py-1.5'}`}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {!isCollapsed && <span className="font-bold">Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>}
            </button>
            <button onClick={onLogout} className={`flex items-center gap-2 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all text-[11px] w-full ${isCollapsed ? 'justify-center p-2' : 'px-3 py-1.5'}`}>
              <LogOut size={14} />
              {!isCollapsed && <span className="font-bold">Sair do App</span>}
            </button>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative flex flex-col transition-all duration-300">

        {/* Mobile Header */}
        <header className={`lg:hidden sticky top-0 z-[50] flex items-center justify-between p-4 bg-[hsl(var(--bg-main))/0.8] backdrop-blur-md border-b border-[hsl(var(--border))] shadow-md ${activeView === 'HUB' ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))]">
              <Menu size={24} />
            </button>
            <span className="font-black text-sm tracking-tighter text-[hsl(var(--text-bright))] uppercase">
              MONITOR<span className="text-[hsl(var(--accent))]">PRO</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--bg-user-block))] flex items-center justify-center text-[hsl(var(--accent))] border border-[hsl(var(--border))]">
            <User size={18} />
          </div>
        </header>

        {/* Content Area */}
        <div className={`flex-1 max-w-screen-2xl mx-auto w-full pb-28 relative transition-all duration-300 ${(['QUESTOES', 'PERFORMANCE', 'CADASTRO_QUESTOES'].includes(activeView)) ? 'p-2 lg:p-4' : 'p-4 lg:p-10'}`}>

          {(() => {
            const isStudyModule = [
              'DASHBOARD', 'HOME', 'REGISTRAR', 'EDITAL', 'REVISOES',
              'HISTORICO', 'SIMULADOS', 'FLASHCARDS', 'DISCURSIVA',
              'GABARITO_IA', 'ANALISE_ERROS', 'RELATORIOS'
            ].includes(activeView);
            const isQuestionModule = ['QUESTOES'].includes(activeView);

            return (
              <header className={`mb-4 animate-in fade-in slide-in-from-top-4 duration-700 ${isQuestionModule || activeView === 'PERFORMANCE' ? 'mb-2' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                  <div className="flex items-center gap-3">
                    {activeView === 'HUB' ? null : (
                      <h2 className={`font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter leading-none ${isQuestionModule || activeView === 'PERFORMANCE' ? 'text-sm lg:text-base' : 'text-xl lg:text-2xl'}`}>
                        {missaoAtiva || 'Selecione uma Missão'}
                      </h2>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-6 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-secondary))] rounded-full opacity-50" />
                      <p className="text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em] text-[7px] lg:text-[8px]">
                        {activeView.replace('_', ' ')} <span className="mx-1.5 opacity-20">|</span> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </header>
            );
          })()}

          {/* Children Content with Framer Motion Transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;