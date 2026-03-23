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
            {/* Botão principal */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-xs font-bold text-[hsl(var(--text-main))] flex justify-between items-center transition-all hover:bg-[hsl(var(--bg-card))] hover:text-[hsl(var(--text-bright))] ${isOpen ? 'ring-2 ring-opacity-50 ' + colorClass : ''}`}
            >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {icon}
                    <span className="truncate">{displayValue}</span>
                </div>
                <ChevronDown size={14} className={`ml-2 shrink-0 text-[hsl(var(--text-muted))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} max-h-[300px] overflow-y-auto bg-[hsl(var(--bg-sidebar))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-[9999] custom-scrollbar animate-in fade-in slide-in-from-top-2`}
                    style={{ width: '300px', maxWidth: '90vw' }}
                >
                    {/* Limpar seleção */}
                    <div
                        onClick={() => {
                            onChange('Todos');
                            setIsOpen(false);
                        }}
                        className="p-3 border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent-glow))] hover:text-[hsl(var(--accent))] cursor-pointer transition-colors"
                    >
                        <span className="text-xs font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest">Limpar Seleção</span>
                    </div>

                    {/* Opções */}
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className={`p-3 border-b border-[hsl(var(--border))] last:border-0 cursor-pointer transition-colors flex items-start gap-2
                                ${value === opt
                                    ? 'bg-[hsl(var(--accent-glow))] text-[hsl(var(--accent))]'
                                    : 'text-[hsl(var(--text-main))] hover:bg-[hsl(var(--bg-user-block))] hover:text-[hsl(var(--text-bright))]'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${value === opt ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--text-muted))]'}`} />
                            <span className="text-xs font-medium leading-relaxed flex-1">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};