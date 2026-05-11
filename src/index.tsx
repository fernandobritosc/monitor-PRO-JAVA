import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from "@sentry/react";
import App from './App';
import './index.css';

// Inicialização do Sentry (Prioritário conforme AGENTS.md)
Sentry.init({
  dsn: (import.meta as any).env.VITE_SENTRY_DSN || "", // O usuário deve configurar VITE_SENTRY_DSN no .env
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: (import.meta as any).env.MODE,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const FallbackComponent = ({ error }: { error: unknown }) => (
  <div className="min-h-screen bg-[hsl(var(--bg-main))] flex flex-col items-center justify-center p-4 text-center font-sans">
    <div className="bg-red-500/10 text-red-500 p-6 rounded-2xl max-w-md w-full border border-red-500/20 shadow-xl">
      <h2 className="text-xl font-bold mb-4">Algo deu errado</h2>
      <p className="text-sm opacity-80 mb-6">Nossa equipe técnica já foi notificada silenciosamente. Tente recarregar a página ou voltar mais tarde.</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-all w-full"
      >
        Recarregar Página
      </button>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={FallbackComponent} showDialog={false}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

