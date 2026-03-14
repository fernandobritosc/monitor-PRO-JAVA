import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomFilterDropdownProps {
    label: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
    icon?: React.ReactNode;
    widthClass?: string;
    colorClass?: string;
    align?: 'left' | 'right';
}

export const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = ({
    label,
    value,
    options,
    onChange,
    icon,
    widthClass = "w-48",
    colorClass = "focus:ring-cyan-500",
    align = 'left',
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

    const displayValue = value === 'Todas' || value === 'Todos' ? label : value;

    return (
        <div className={`relative ${widthClass}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 flex justify-between items-center transition-all hover:bg-slate-800/50 ${isOpen ? 'ring-2 ring-opacity-50 ' + colorClass : ''}`}
            >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {icon}
                    <span className="truncate">{displayValue}</span>
                </div>
                <ChevronDown size={14} className={`ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div
                    className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} max-h-[300px] overflow-y-auto bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl z-[9999] custom-scrollbar animate-in fade-in slide-in-from-top-2`}
                    style={{ width: '300px', maxWidth: '90vw' }}
                >
                    <div
                        onClick={() => {
                            onChange(label.includes('Matéria') || label.includes('Assunto') ? 'Todos' : 'Todos');
                            setIsOpen(false);
                        }}
                        className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Limpar Seleção</span>
                    </div>
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className={`p-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors flex items-start gap-2 ${value === opt ? 'bg-cyan-500/10' : ''}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${value === opt ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                            <span className={`text-xs font-medium leading-relaxed flex-1 ${value === opt ? 'text-cyan-100' : 'text-slate-300'}`}>
                                {opt}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
