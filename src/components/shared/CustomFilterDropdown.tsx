import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useClick,
    useDismiss,
    useRole,
    useInteractions,
    FloatingPortal,
    FloatingFocusManager,
} from '@floating-ui/react';

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

export const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = React.memo(({
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

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [
            offset(8),
            flip({ fallbackAxisSideDirection: 'end' }),
            shift({ padding: 10 }),
        ],
        whileElementsMounted: autoUpdate,
        placement: align === 'right' ? 'bottom-end' : 'bottom-start',
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context);

    const { getReferenceProps, getFloatingProps } = useInteractions([
        click,
        dismiss,
        role,
    ]);

    const displayValue = value === 'Todas' || value === 'Todos' ? label : value;

    return (
        <div className={widthClass}>
            {/* Botão principal */}
            <button
                type="button"
                ref={refs.setReference}
                {...getReferenceProps()}
                className={`w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-xs font-bold text-[hsl(var(--text-main))] flex justify-between items-center transition-all hover:bg-[hsl(var(--bg-card))] hover:text-[hsl(var(--text-bright))] ${isOpen ? 'ring-2 ring-opacity-50 ' + colorClass : ''}`}
            >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {icon}
                    <span className="truncate">{displayValue}</span>
                </div>
                <ChevronDown size={14} className={`ml-2 shrink-0 text-[hsl(var(--text-muted))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            <FloatingPortal>
                {isOpen && (
                    <FloatingFocusManager context={context} modal={false}>
                        <div
                            ref={refs.setFloating}
                            style={{
                                ...floatingStyles,
                                width: '300px',
                                maxWidth: '90vw',
                            }}
                            {...getFloatingProps()}
                            className="bg-[hsl(var(--bg-sidebar))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-[100] custom-scrollbar animate-in fade-in slide-in-from-top-2"
                        >
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
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
                        </div>
                    </FloatingFocusManager>
                )}
            </FloatingPortal>
        </div>
    );
});
