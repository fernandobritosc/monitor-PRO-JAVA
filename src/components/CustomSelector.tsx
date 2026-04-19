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

interface CustomSelectorProps {
    label: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
    icon?: React.ReactNode;
    placeholder?: string;
    className?: string;
}

export const CustomSelector: React.FC<CustomSelectorProps> = React.memo(({
    value,
    options,
    onChange,
    icon,
    placeholder = "Selecione...",
    className = ""
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
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context);

    const { getReferenceProps, getFloatingProps } = useInteractions([
        click,
        dismiss,
        role,
    ]);

    const displayValue = value || placeholder;

    return (
        <div className={className}>
            <button
                type="button"
                ref={refs.setReference}
                {...getReferenceProps()}
                className={`w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black text-xs uppercase tracking-widest flex justify-between items-center hover:bg-[hsl(var(--bg-card))] ${isOpen ? 'ring-2 ring-[hsl(var(--accent)/0.5)]' : ''}`}
            >
                <div className="flex items-center gap-3 truncate">
                    {icon && <span className="text-[hsl(var(--accent))]">{icon}</span>}
                    <span className="truncate">{displayValue}</span>
                </div>
                <ChevronDown size={18} className={`text-[hsl(var(--text-muted))] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <FloatingPortal>
                {isOpen && (
                    <FloatingFocusManager context={context} modal={false}>
                        <div
                            ref={refs.setFloating}
                            style={{
                                ...floatingStyles,
                                width: refs.domReference.current?.getBoundingClientRect().width,
                            }}
                            {...getFloatingProps()}
                            className="bg-[hsl(var(--bg-sidebar))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 backdrop-blur-3xl"
                        >
                            {/* Limpar seleção */}
                            <div
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="px-6 py-4 text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest hover:bg-[hsl(var(--accent-glow))] hover:text-[hsl(var(--accent))] cursor-pointer border-b border-[hsl(var(--border))] transition-all"
                            >
                                Limpar Seleção
                            </div>

                            {/* Opções */}
                            {options.map((opt, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                    }}
                                    className={`px-6 py-4 text-xs font-bold transition-all border-b border-[hsl(var(--border))] last:border-0 cursor-pointer flex items-center gap-3
                                        ${value === opt
                                            ? 'bg-[hsl(var(--accent-glow))] text-[hsl(var(--accent))]'
                                            : 'text-[hsl(var(--text-main))] hover:bg-[hsl(var(--bg-user-block))] hover:text-[hsl(var(--text-bright))]'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${value === opt ? 'bg-[hsl(var(--accent))] animate-pulse' : 'bg-[hsl(var(--text-muted))]'}`} />
                                    <span className="flex-1 leading-relaxed truncate">{opt}</span>
                                </div>
                            ))}
                        </div>
                    </FloatingFocusManager>
                )}
            </FloatingPortal>
        </div>
    );
});
