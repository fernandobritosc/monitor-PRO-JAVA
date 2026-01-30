
import React, { useState } from 'react';
import { 
  Home, 
  PencilLine, 
  BarChart3, 
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
  User
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
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 bg-slate-800 border border-white/10 text-slate-400 p-1.5 rounded-full hover:text-white hover:bg-cyan-500 transition-all z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex flex-col h-full ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center gap-3 mb-8 shrink-0 transition-all ${isCollapsed ? 'justify-center' : 'px-2'}`}>
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
                <div className="overflow-hidden animate-in fade-in duration-300">
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
                    ${isCollapsed ? 'justify-center p-3' : 'px-4 py-2.5'}
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

          <div className="mt-4 shrink-0">
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
              {activeView.replace('_', ' ')} <span className="w-1 h-1 bg-slate-500 rounded-full"/> {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
