import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useAppStore();

  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 transition-colors ${className}`}
      title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
