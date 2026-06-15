import React from 'react';
import { X } from 'lucide-react';

interface StudyFormHeaderProps {
    isSimulado: boolean;
    onCancel?: () => void;
}

export const StudyFormHeader: React.FC<StudyFormHeaderProps> = ({ isSimulado, onCancel }) => {
    return (
        <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black flex items-center gap-5 relative z-10 text-[hsl(var(--text-bright))] uppercase tracking-tighter">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl transition-transform duration-500 hover:scale-110 ${isSimulado ? 'bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-secondary))] shadow-[hsl(var(--accent)/0.3)]' : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/30'}`}>
                    {isSimulado ? '🏆' : '📝'}
                </div>
                <span className="text-gradient leading-tight">
                    {isSimulado ? 'Novo Simulado' : 'Novo Estudo'}
                </span>
            </h3>
            {isSimulado && onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-2 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] font-black px-6 py-2.5 rounded-2xl transition-all border border-[hsl(var(--border))] text-[10px] uppercase tracking-widest active:scale-95"
                >
                    <X size={14} /> VOLTAR
                </button>
            )}
        </div>
    );
};
