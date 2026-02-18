

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  approved?: boolean;
  is_admin?: boolean;
  created_at?: string;
}

export interface StudyRecord {
  id: string;
  user_id: string;
  concurso: string;
  materia: string;
  assunto: string;
  data_estudo: string;
  acertos: number;
  total: number;
  taxa: number;
  tempo: number; // minutes
  dificuldade: '🟢 Fácil' | '🟡 Médio' | '🔴 Difícil' | 'Simulado';
  relevancia: number;
  comentarios?: string;
  rev_24h: boolean;
  rev_07d: boolean;
  rev_15d: boolean;
  rev_30d: boolean;
  meta?: string | number;
  analise_erros?: ErrorAnalysis[]; // Qualitativo: O "porquê" do erro
}

export interface ErrorAnalysis {
  questao_preview: string;
  tipo_erro: 'Atenção' | 'Lacuna de Base' | 'Interpretação';
  gatilho: string;
  sugestao: string;
}

export interface EditalMateria {
  id: string;
  user_id: string;
  concurso: string;
  cargo: string;
  materia: string;
  topicos: string[];
  data_prova?: string;
  is_principal: boolean;
  peso?: number; // Novo campo para cálculo ponderado
}

export interface Question {
  id: string;
  user_id: string;
  concurso: string;
  data: string;
  materia: string;
  assunto: string;
  simulado?: string;
  relevancia: number;
  anotacoes?: string;
  status: 'Pendente' | 'Revisado' | 'Dominado';
  tags?: string[];
  meta: number;
}

export interface EditalProgress {
  materia: string;
  total: number;
  concluido: number;
  porcentagem: number;
}

export interface AIProvider {
  name: string;
  icon: string;
  color: string;
  description: string;
  available: boolean;
}

export interface AIResponse {
  content: string;
  provider: string;
  tokens?: number;
}

export interface GabaritoItem {
  numero_questao: number;
  enunciado: string; // NOVO
  alternativa_correta_ia: string;
  justificativa: string;
}

export interface SavedGabarito {
  id: string;
  user_id: string;
  created_at: string;
  file_name: string;
  results_json: GabaritoItem[];
  user_answers_json: Record<number, string>;
  official_answers_json: Record<number, string>;
}

export type ViewType = 'HOME' | 'REGISTRAR' | 'DASHBOARD' | 'EDITAL' | 'REVISOES' | 'GUIA_SEMANAL' | 'QUESTOES' | 'HISTORICO' | 'SIMULADOS' | 'CONFIGURAR' | 'REGISTRAR_SIMULADO' | 'RELATORIOS' | 'FLASHCARDS' | 'DISCURSIVA' | 'GABARITO_IA' | 'ANALISE_ERROS';