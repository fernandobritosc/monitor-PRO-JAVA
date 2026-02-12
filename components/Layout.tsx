import React, { useState } from 'react';
import {
  Home,
  PencilLine,
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
  User,
  Zap,
  X,
  FileEdit,
  FileCheck
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

// Safe version check
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.17';

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
    { id: 'FLASHCARDS', label: 'Flashcards', icon: Zap, isNew: true },
    { id: 'DISCURSIVA', label: 'Discursiva IA', icon: FileEdit, isNew: true },
    { id: 'GABARITO_IA', label: 'Gabarito IA', icon: FileCheck, isNew: true },
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
    <div className="min-h-screen flex bg-[#0B0E14] text-[#E2E8F0] font-['Montserrat']">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] lg:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen 
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
        bg-[#0B0E14] lg:bg-[#0B0E14]/90 lg:backdrop-blur-xl border-r border-[#22D3EE1A]
        z-[70] transition-all duration-300 flex flex-col shadow-2xl lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 bg-[#0B0E14] border border-[#22D3EE33] text-[#22D3EE] p-1.5 rounded-full hover:bg-[#22D3EE] hover:text-[#0B0E14] transition-all z-50 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex flex-col h-full ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center gap-3 mb-10 shrink-0 transition-all mt-2 lg:mt-0 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-2 h-8 bg-[#22D3EE] rounded-full" />
              {!isCollapsed && (
                <h1 className="text-xl font-extrabold tracking-tighter leading-none text-white">
                  MONITOR<span className="text-[#22D3EE] ml-1">PRO</span>
                </h1>
              )}
            </div>
          </div>

          <div className={`
            bg-[#1E293B33] border border-white/5 rounded-2xl mb-8 shrink-0 transition-all
            ${isCollapsed ? 'p-2' : 'p-4'}
          `}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-[#22D3EE] border border-[#22D3EE1A] shrink-0">
                <User size={18} />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden animate-in fade-in duration-300 min-w-0">
                  <div className="font-bold text-white text-xs truncate">{userEmail.split('@')[0]}</div>
                  <div className="text-[10px] text-[#22D3EE] uppercase tracking-widest font-bold opacity-70">Perfil</div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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
                  className={`w-full flex items-center gap-3.5 rounded-xl transition-all duration-300 text-sm group relative
                    ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}
                    ${isActive
                      ? 'bg-[#22D3EE1A] text-[#22D3EE] shadow-[inset_0_0_10px_rgba(34,211,238,0.05)]'
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={18} className={`${isActive ? 'text-[#22D3EE]' : 'text-slate-600 group-hover:text-slate-300'} transition-colors shrink-0`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex justify-between items-center animate-in fade-in duration-300">
                      <span className={`truncate text-left font-medium ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                      {item.isNew && <span className="text-[8px] font-black bg-[#22D3EE] text-[#0B0E14] px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">New</span>}
                    </div>
                  )}
                  {isActive && !isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#22D3EE] rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 shrink-0 space-y-2 pb-4 lg:pb-0">
            <button
              onClick={onLogout}
              className={`flex items-center gap-3.5 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-sm w-full
                ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}
              `}
              title={isCollapsed ? 'Sair' : ''}
            >
              <LogOut size={18} />
              {!isCollapsed && <span className="font-medium">Sair</span>}
            </button>
            {!isCollapsed && (
              <div className="text-center text-[9px] text-slate-700 font-bold tracking-widest uppercase opacity-50">
                Version {APP_VERSION}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative transition-all duration-300 flex flex-col bg-[#0B0E14]">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-[50] flex items-center justify-between p-4 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#22D3EE1A] shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-[#22D3EE]"><Menu size={24} /></button>
            <span className="font-extrabold text-sm tracking-tighter text-white">MONITOR<span className="text-[#22D3EE] ml-0.5">PRO</span></span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#1E293B33] flex items-center justify-center text-[#22D3EE] border border-[#22D3EE1A]"><User size={16} /></div>
        </header>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-10 pb-24">
          <div className="mb-10">
            <h2 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tighter break-words">
              {missaoAtiva || 'Selecione uma Missão'}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-1 w-12 bg-[#22D3EE] rounded-full" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] lg:text-xs">
                {activeView.replace('_', ' ')} <span className="mx-2 opacity-30">|</span> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;