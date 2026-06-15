import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FormMessageBannerProps {
    msg: { type: 'success' | 'error' | 'info'; text: string } | null;
}

export const FormMessageBanner: React.FC<FormMessageBannerProps> = ({ msg }) => {
    if (!msg) return null;

    const { type, text } = msg;

    const styles = {
        success: 'bg-green-500/10 border-green-500/20 text-green-400',
        error: 'bg-red-500/10 border-red-500/20 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };

    const icons = {
        success: <CheckCircle2 size={24} />,
        error: <div className="text-xl">⚠️</div>,
        info: <div className="text-xl">ℹ️</div>,
    };

    return (
        <div className={`mb-8 p-6 rounded-2xl flex items-center gap-4 text-sm font-black border animate-in slide-in-from-top-4 ${styles[type]}`}>
            {icons[type]}
            <span className="uppercase tracking-widest">{text}</span>
        </div>
    );
};
