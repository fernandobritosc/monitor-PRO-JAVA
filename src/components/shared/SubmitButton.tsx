import React from 'react';

interface SubmitButtonProps {
    loading: boolean;
    label?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ loading, label = 'Salvar Registro' }) => {
    return (
        <div className="flex gap-6 pt-6 border-t border-[hsl(var(--border))]">
            <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-purple-600 to-[hsl(var(--accent))] hover:scale-[1.02] active:scale-95 text-[hsl(var(--bg-main))] font-black py-5 rounded-2xl shadow-2xl shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-[hsl(var(--bg-main))/0.3] border-t-[hsl(var(--bg-main))] rounded-full animate-spin"></div>
                        <span>Salvando...</span>
                    </>
                ) : (
                    <span>{label}</span>
                )}
            </button>
        </div>
    );
};
