import React from 'react';
import { cn } from '../../../utils/cn';

interface FlashcardsTabsProps {
  activeTab: string;
  setActiveTab: (tab: 'study' | 'manage' | 'community') => void;
}

type TabKey = 'study' | 'manage' | 'community';

export const FlashcardsTabs: React.FC<FlashcardsTabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'study', label: 'Sessão Estudo' },
    { key: 'manage', label: 'Inventário' },
    { key: 'community', label: 'Arsenal Global' },
  ];

  return (
    <div className="flex p-1.5 bg-[hsl(var(--bg-user-block))] rounded-[1.5rem] border border-[hsl(var(--border))] shadow-xl">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          className={cn(
            'px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
            activeTab === key
              ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]'
              : 'text-[hsl(var(--text-muted))] hover:text-white'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
