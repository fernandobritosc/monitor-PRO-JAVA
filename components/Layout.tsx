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
  Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabase';

type ViewType = 'HOME' | 'REGISTRAR' | 'DASHBOARD' | 'EDITAL' | 'REVISOES' | 'GUIA_SEMANAL' | 'QUESTOES' | 'HISTORICO' | 'SIMULADOS' | 'CONFIGURAR' | 'REGISTRAR_SIMULADO' | 'RELATORIOS' | 'FLASHCARDS' | 'DISCURSIVA' | 'GABARITO_IA';

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

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.27';

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
    window.location.reload();
  };

  const menuItems = [
    { id: 'DASHBOARD', label: 'Painel Geral', icon: TrendingUp },
    { id: 'REGISTRAR', label: 'Registrar Estudo', icon: PlusCircle },
    { id: 'EDITAL', label: 'Edital Vertical', icon: BookOpen },
    { id: 'QUESTOES', label: 'Banco de Questões', icon: CheckSquare },
    { id: 'REVISOES', label: 'Revisões Ativas', icon: Clock },
    { id: 'HISTORICO', label: 'Histórico Completo', icon: Activity },
    { id: 'GUIA_SEMANAL', label: 'Planner Semanal', icon: Calendar },
    { id: 'SIMULADOS', label: 'Simulados & Provas', icon: Target },
    { id: 'FLASHCARDS', label: 'Mega Flashcards', icon: Zap },
    { id: 'DISCURSIVA', label: 'IA Discursiva', icon: FileText, isNew: true },
    { id: 'GABARITO_IA', label: 'Gabarito IA', icon: Sparkles },
    { id: 'RELATORIOS', label: 'Relatórios Pro', icon: TrendingUp },
    { id: 'CONFIGURAR', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[hsl(var(--bg-main))] relative">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen 
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
        w-72
        bg-[hsl(var(--bg-sidebar)/0.8)] backdrop-blur-[var(--glass-blur)]
        border-r border-[hsl(var(--border))]
        z-[70] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] text-[hsl(var(--accent))] p-1.5 rounded-full hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] transition-all z-[80] shadow-lg shadow-black/20"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo Section */}
        <div className="p-6 shrink-0 flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${isCollapsed ? 'lg:opacity-0' : 'opacity-100'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-secondary))] flex items-center justify-center text-xl shadow-lg shadow-[hsl(var(--accent)/0.2)]">
              🎯
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-[hsl(var(--text-bright))] leading-none">
                MONITOR<span className="text-[hsl(var(--accent))]">PRO</span>
              </h1>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))] mt-1">SISTEMA INTELIGENTE</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-[hsl(var(--text-muted))] hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className={`
            bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl mx-3 mb-8 shrink-0 transition-all duration-300
            ${isCollapsed ? 'p-2' : 'p-4'}
          `}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--bg-main))] flex items-center justify-center text-[hsl(var(--accent))] border border-[hsl(var(--border))] shrink-0 shadow-sm">
              <User size={18} />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="font-bold text-[hsl(var(--text-bright))] text-[11px] truncate uppercase tracking-tight">{userEmail.split('@')[0]}</div>
                <div className="text-[9px] text-[hsl(var(--accent))] uppercase tracking-widest font-bold opacity-70">Perfil Pro</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as ViewType);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 rounded-xl transition-all duration-300 text-sm group relative overflow-hidden
                  ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}
                  ${isActive
                    ? 'bg-[hsl(var(--accent-glow))] text-[hsl(var(--accent))] shadow-[inset_0_0_20px_hsl(var(--accent)/0.05)]'
                    : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-[hsl(var(--bg-user-block))]'
                  }
                `}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={18} className={`${isActive ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--accent))]'} transition-colors shrink-0`} />
                {!isCollapsed && (
                  <div className="flex-1 flex justify-between items-center animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className={`truncate text-left font-bold tracking-tight ${isActive ? 'text-[hsl(var(--text-bright))]' : 'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>
                    {item.isNew && <span className="text-[8px] font-black bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">Novo</span>}
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[hsl(var(--accent))] rounded-r-full shadow-[0_0_15px_hsl(var(--accent)/0.8)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-4 shrink-0 space-y-2 pb-6 px-3">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3.5 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--bg-user-block))] rounded-xl transition-all text-sm w-full
              ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}
            `}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!isCollapsed && <span className="font-bold">Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>}
          </button>

          <button
            onClick={onLogout}
            className={`flex items-center gap-3.5 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-sm w-full
              ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}
            `}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="font-bold">Sair do App</span>}
          </button>

          {!isCollapsed && (
            <div className="text-center text-[9px] text-[hsl(var(--text-muted))] font-bold tracking-widest uppercase opacity-20 px-4 pt-2">
              MonitorPro v{APP_VERSION}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative flex flex-col transition-all duration-300">

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-[50] flex items-center justify-between p-4 bg-[hsl(var(--bg-main))/0.8] backdrop-blur-md border-b border-[hsl(var(--border))] shadow-md">
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
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-10 pb-28 relative">

          {/* View Title Section */}
          <header className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl lg:text-5xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter leading-[0.9] mb-4">
                  {missaoAtiva || 'Selecione uma Missão'}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="h-1 w-16 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-secondary))] rounded-full shadow-[0_0_15px_hsl(var(--accent)/0.5)]" />
                  <p className="text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em] text-[10px] lg:text-xs">
                    {activeView.replace('_', ' ')} <span className="mx-2 opacity-20">|</span> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Children Content with Fade In */}
          <div className="relative z-10 animate-in fade-in zoom-in-95 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;