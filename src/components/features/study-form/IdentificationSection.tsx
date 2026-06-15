import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { EditalMateria } from '../../../types';
import { CustomSelector } from '../../CustomSelector';
import { StudyTypeToggle } from './StudyTypeToggle';

interface IdentificationSectionProps {
    tipo: 'Estudo' | 'Revisão';
    setTipo: (v: 'Estudo' | 'Revisão') => void;
    dataEstudo: string;
    setDataEstudo: (v: string) => void;
    materia: string;
    setMateria: (v: string) => void;
    materiasDisponiveis: EditalMateria[];
    assunto: string;
    setAssunto: (v: string) => void;
    topicosDisponiveis: string[];
}

export const IdentificationSection: React.FC<IdentificationSectionProps> = ({
    tipo,
    setTipo,
    dataEstudo,
    setDataEstudo,
    materia,
    setMateria,
    materiasDisponiveis,
    assunto,
    setAssunto,
    topicosDisponiveis,
}) => {
    const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowTopicsDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="glass-premium p-8 rounded-3xl border border-[hsl(var(--border))] space-y-8 relative z-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex flex-col md:flex-row gap-8">
                <StudyTypeToggle value={tipo} onChange={setTipo} />

                <div className="flex-1 space-y-3">
                    <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                        <Calendar size={14} className="text-[hsl(var(--accent))]" /> Data da Atividade
                    </label>
                    <input type="date" required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black uppercase tracking-widest" value={dataEstudo} onChange={(e) => setDataEstudo(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Matéria</label>
                    <CustomSelector
                        label="Matéria"
                        value={materia}
                        options={materiasDisponiveis.map(m => m.materia)}
                        onChange={(val) => setMateria(val)}
                        placeholder="Selecione a disciplina..."
                    />
                </div>
            </div>
            <div className="space-y-2" ref={dropdownRef}>
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Assunto / Tópico</label>
                <div className="relative">
                    <input
                        type="text"
                        required
                        className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-bold placeholder-[hsl(var(--text-muted)/0.5)]"
                        value={assunto}
                        onChange={(e) => {
                            setAssunto(e.target.value);
                        }}
                        onClick={() => {
                            if (materia && topicosDisponiveis.length > 0) setShowTopicsDropdown(true);
                        }}
                        placeholder="Ex: Crase"
                    />
                    {materia && topicosDisponiveis.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] rounded-lg transition-colors"
                            title="Ver lista completa de tópicos"
                        >
                            {showTopicsDropdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    )}
                    {showTopicsDropdown && materia && topicosDisponiveis.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-[hsl(var(--bg-sidebar))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-4 backdrop-blur-3xl">
                            <div
                                onClick={() => { setAssunto(''); setShowTopicsDropdown(false); }}
                                className="px-6 py-4 text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest hover:bg-[hsl(var(--accent-glow))] hover:text-[hsl(var(--accent))] cursor-pointer border-b border-[hsl(var(--border))] transition-all"
                            >
                                Limpar Seleção
                            </div>
                            {topicosDisponiveis.map((t, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        setAssunto(t);
                                        setShowTopicsDropdown(false);
                                    }}
                                    className={`px-6 py-4 text-xs font-bold transition-all border-b border-[hsl(var(--border))] last:border-0 cursor-pointer flex items-center gap-3 ${assunto === t ? 'bg-[hsl(var(--accent-glow))] text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-main))] hover:bg-[hsl(var(--bg-user-block))] hover:text-[hsl(var(--text-bright))]'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${assunto === t ? 'bg-[hsl(var(--accent))] animate-pulse' : 'bg-[hsl(var(--text-muted))]'}`} />
                                    <span className="flex-1 leading-relaxed truncate">{t}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
