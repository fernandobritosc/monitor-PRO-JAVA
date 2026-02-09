<<<<<<< HEAD

=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
import React, { useState } from 'react';
import { 
  Home, 
  PencilLine, 
<<<<<<< HEAD
  BarChart3, 
=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  RotateCcw, 
  History as HistoryIcon, 
  Trophy, 
  Settings, 
  LogOut,
  Menu,
  CalendarCheck,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  FileText,
  Map,
<<<<<<< HEAD
  User
=======
  User,
  Zap,
  X,
  FileEdit
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
} from 'lucide-react';
import { ViewType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  userEmail: string;
  onLogout: () => void;
  missaoAtiva?: string;
}

<<<<<<< HEAD
=======
// Safe version check
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.17';

>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  setActiveView, 
  userEmail, 
  onLogout, 
  missaoAtiva
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'EDITAL', label: 'Meu Edital', icon: Map, isNew: true },
<<<<<<< HEAD
=======
    { id: 'FLASHCARDS', label: 'Flashcards', icon: Zap, isNew: true },
    { id: 'DISCURSIVA', label: 'Discursiva IA', icon: FileEdit, isNew: true },
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
    { id: 'GUIA_SEMANAL', label: 'Guia Semanal', icon: CalendarCheck },
    { id: 'REVISOES', label: 'Revisões', icon: RotateCcw },
    { id: 'QUESTOES', label: 'Banco de Questões', icon: FileQuestion },
    { id: 'REGISTRAR', label: 'Registrar', icon: PencilLine },
    { id: 'RELATORIOS', label: 'Relatórios PDF', icon: FileText },
    { id: 'SIMULADOS', label: 'Simulados', icon: Trophy },
    { id: 'HISTORICO', label: 'Histórico', icon: HistoryIcon },
    { id: 'CONFIGURAR', label: 'Configurar', icon: Settings },
  ];

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex bg-[#12151D] text-white">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen 
        ${isCollapsed ? 'lg:w-20' : 'lg:w-60'}
        w-64
        bg-[#12151D]/80 backdrop-blur-lg border-r border-white/10
        z-50 transition-all duration-300 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
=======
    <div className="min-h-screen flex bg-[#12151D] text-white font-['Montserrat']">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen 
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
        bg-[#12151D] lg:bg-[#12151D]/80 lg:backdrop-blur-xl border-r border-white/10
        z-[70] transition-all duration-300 flex flex-col shadow-2xl lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
        >
            <X size={20} />
        </button>

        {/* Desktop Collapse Button */}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 bg-slate-800 border border-white/10 text-slate-400 p-1.5 rounded-full hover:text-white hover:bg-cyan-500 transition-all z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex flex-col h-full ${isCollapsed ? 'p-2' : 'p-4'}`}>
<<<<<<< HEAD
          <div className={`flex items-center gap-3 mb-8 shrink-0 transition-all ${isCollapsed ? 'justify-center' : 'px-2'}`}>
=======
          <div className={`flex items-center gap-3 mb-8 shrink-0 transition-all mt-2 lg:mt-0 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20 shrink-0">
              🎯
            </div>
            {!isCollapsed && (
              <div className="animate-in fade-in duration-300 overflow-hidden whitespace-nowrap">
                <h1 className="text-lg font-extrabold tracking-tighter leading-none">
                  Monitor<span className="bg-white text-[#12151D] px-1 rounded ml-0.5">PRO</span>
                </h1>
              </div>
            )}
          </div>

          <div className={`
            bg-slate-900/30 border border-white/5 rounded-xl mb-6 shrink-0 transition-all
            ${isCollapsed ? 'p-2' : 'p-3'}
          `}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-white/10 shrink-0">
                <User size={16} />
              </div>
              {!isCollapsed && (
<<<<<<< HEAD
                <div className="overflow-hidden animate-in fade-in duration-300">
=======
                <div className="overflow-hidden animate-in fade-in duration-300 min-w-0">
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
                  <div className="font-bold text-white text-xs truncate">{userEmail.split('@')[0]}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Usuário</div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {menuItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id as ViewType);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 rounded-lg transition-all duration-200 text-sm group relative
<<<<<<< HEAD
                    ${isCollapsed ? 'justify-center p-3' : 'px-4 py-2.5'}
=======
                    ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 lg:py-2.5'}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
                    ${isActive 
                      ? 'bg-purple-500/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-cyan-400 rounded-r-full animate-in fade-in" />}
                  <Icon size={18} className={`${isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-white'} transition-colors shrink-0`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex justify-between items-center animate-in fade-in duration-200">
                      <span className="truncate text-left">{item.label}</span>
                      {item.isNew && <span className="text-[9px] font-bold bg-cyan-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">Novo</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

<<<<<<< HEAD
          <div className="mt-4 shrink-0">
=======
          <div className="mt-4 shrink-0 space-y-2 pb-4 lg:pb-0">
            {!isCollapsed && (
                <div className="text-center text-[10px] text-slate-600 font-mono">
                    v{APP_VERSION}
                </div>
            )}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
            <button
              onClick={onLogout}
              className={`flex items-center gap-3.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all text-sm w-full
                ${isCollapsed ? 'justify-center p-3' : 'px-4 py-2.5'}
              `}
              title={isCollapsed ? 'Sair' : ''}
            >
              <LogOut size={18} />
              {!isCollapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>

<<<<<<< HEAD
      <main className="flex-1 min-w-0 relative transition-all duration-300">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between p-4 glass border-b border-white/5">
          <button onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <span className="font-bold text-sm tracking-tight">MONITORPRO</span>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><User size={16} /></div>
        </header>

        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tight">
              {missaoAtiva || 'Selecione uma Missão'}
            </h2>
            <p className="text-slate-500 font-medium uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
=======
      {/* Main Content */}
      <main className="flex-1 min-w-0 relative transition-all duration-300 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-[50] flex items-center justify-between p-4 bg-[#12151D]/90 backdrop-blur-md border-b border-white/5 shadow-md">
          <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-300 hover:text-white"><Menu size={24} /></button>
              <span className="font-bold text-sm tracking-tight text-white">MONITOR<span className="text-cyan-400">PRO</span></span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-white/10"><User size={16} /></div>
        </header>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 pb-24">
          <div className="mb-6 lg:mb-8">
            <h2 className="text-xl lg:text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tight break-words">
              {missaoAtiva || 'Selecione uma Missão'}
            </h2>
            <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px] lg:text-xs mt-1 flex items-center gap-2">
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
              {activeView.replace('_', ' ')} <span className="w-1 h-1 bg-slate-500 rounded-full"/> {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

<<<<<<< HEAD
export default Layout;
=======
export default Layout;
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
