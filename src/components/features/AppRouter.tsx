import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomeView from '../../views/HomeView';
import EditalView from '../../views/EditalProgress';
import RegistrarEstudoView from '../../views/StudyForm';
import RevisoesView from '../../views/Revisoes';
import HistoricoView from '../../views/History';
import SimuladosView from '../../views/Simulados';
import ConfigurarView from '../../views/Configurar';
import RelatoriosView from '../../views/Reports';
import { ErrorAnalysisView } from '../../views/ErrorAnalysisView';
import PerformanceView from '../../views/Performance';
import BancoQuestoesView from '../../views/QuestionsBank';
import FlashcardsView from '../../views/Flashcards';
import DiscursivaView from '../../views/Discursiva';
import GabaritoIAView from '../../views/GabaritoIA';
import LibraryView from '../../views/LibraryView';
import RankingView from '../../views/RankingView';

interface AppRouterProps {
  userEmail: string | null;
  session: any; // O tipo exato viria do Supabase, usando any por simplicidade aqui conforme AGENTS.md para flexibilidade rápida se necessário, mas idealmente seria Session.
}

const AppRouter: React.FC<AppRouterProps> = ({ userEmail, session }) => {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />

      <Route path="/edital" element={<EditalView />} />
      <Route path="/registrar" element={<RegistrarEstudoView />} />
      <Route path="/revisoes" element={<RevisoesView />} />
      <Route path="/historico" element={<HistoricoView />} />
      <Route path="/simulados" element={<SimuladosView />} />
      <Route path="/configurar" element={<ConfigurarView />} />
      <Route path="/relatorios" element={<RelatoriosView />} />
      <Route path="/analise-erros" element={<ErrorAnalysisView />} />
      <Route path="/performance" element={<PerformanceView />} />
      <Route path="/questoes" element={<BancoQuestoesView />} />
      <Route path="/flashcards" element={<FlashcardsView />} />
      <Route path="/discursiva" element={<DiscursivaView />} />
      <Route path="/gabarito-ia" element={<GabaritoIAView />} />
      <Route path="/biblioteca" element={<LibraryView />} />
      <Route path="/ranking" element={<RankingView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
