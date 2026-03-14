import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Impede o navegador de mostrar o banner padrão automaticamente
            e.preventDefault();
            // Guarda o evento para disparar depois
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;

        // Mostra o prompt de instalação
        await deferredPrompt.prompt();

        // Espera a escolha do usuário
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('Usuário instalou o PWA');
            setIsInstallable(false);
        }

        setDeferredPrompt(null);
    };

    return { isInstallable, installApp };
}
