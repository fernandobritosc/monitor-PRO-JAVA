import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectorProps {
    label: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
    icon?: React.ReactNode;
    placeholder?: string;
    className?: string;
}

export const CustomSelector: React.FC<CustomSelectorProps> = ({
    label,
    value,
    options,
    onChange,
    icon,
    placeholder = "Selecione...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayValue = value || placeholder;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black text-xs uppercase tracking-widest flex justify-between items-center hover:bg-[hsl(var(--bg-card))] ${isOpen ? 'ring-2 ring-[hsl(var(--accent)/0.5)]' : ''}`}
            >
                <div className="flex items-center gap-3 truncate">
                    {icon && <span className="text-[hsl(var(--accent))]">{icon}</span>}
                    <span className="truncate">{displayValue}</span>
                </div>
                <ChevronDown size={18} className={`text-[hsl(var(--text-muted))] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-[#1a1d26] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-4 backdrop-blur-3xl">
                    <div
                        onClick={() => { onChange(''); setIsOpen(false); }}
                        className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all"
                    >
                        Limpar Seleção
                    </div>
                    {options.map((opt, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className={`px-6 py-4 text-xs font-bold transition-all border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex items-center gap-3 ${value === opt ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-slate-300'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${value === opt ? 'bg-[hsl(var(--accent))] animate-pulse' : 'bg-slate-700'}`} />
                            <span className="flex-1 leading-relaxed truncate">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
