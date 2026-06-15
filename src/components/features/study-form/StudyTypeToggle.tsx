import React from 'react';
import { cn } from '../../../utils/cn';
import { Layers } from 'lucide-react';

interface StudyTypeToggleProps {
    value: 'Estudo' | 'Revisão';
    onChange: (tipo: 'Estudo' | 'Revisão') => void;
}

const TYPES = ['Estudo', 'Revisão'] as const;

export const StudyTypeToggle: React.FC<StudyTypeToggleProps> = ({ value, onChange }) => {
    return (
        <div className="md:w-1/3 space-y-3">
            <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <Layers size={14} className="text-[hsl(var(--accent))]" /> Tipo de Registro
            </label>
            <div className="flex bg-[hsl(var(--bg-user-block))] p-1.5 rounded-2xl border border-[hsl(var(--border))]">
                {TYPES.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        className={cn(
                            'flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                            value === t
                                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.2)]'
                                : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))]',
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>
    );
};
