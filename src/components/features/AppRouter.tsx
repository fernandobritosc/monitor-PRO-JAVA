import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy loading de todas as views para reduzir o bundle inicial
const HubView             = lazy(() => import('../../views/HubView'));
const HomeView            = lazy(() => import('../../views/HomeView'));
const EditalView          = lazy(() => import('../../views/EditalProgress'));
const RegistrarEstudoView = lazy(() => import('../../views/StudyForm'));
const HistoricoView       = lazy(() => import('../../views/History'));
const SimuladosView       = lazy(() => import('../../views/Simulados'));
const ConfigurarView      = lazy(() => import('../../views/Configurar'));
const FlashcardsView      = lazy(() => import('../../views/Flashcards'));
const RankingView         = lazy(() => import('../../views/RankingView'));

interface AppRouterProps {
  userEmail: string | null;
  session: unknown;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen text-[hsl(var(--accent))]">
    Carregando...
  </div>
);

const AppRouter: React.FC<AppRouterProps> = ({ userEmail, session }) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<HubView userEmail={userEmail || ''} />} />
        <Route path="/dashboard" element={<HomeView />} />
        <Route path="/edital" element={<EditalView />} />
        <Route path="/registrar" element={<RegistrarEstudoView />} />
        <Route path="/historico" element={<HistoricoView />} />
        <Route path="/simulados" element={<SimuladosView />} />
        <Route path="/configurar" element={<ConfigurarView />} />
        <Route path="/flashcards" element={<FlashcardsView />} />
        <Route path="/ranking" element={<RankingView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
