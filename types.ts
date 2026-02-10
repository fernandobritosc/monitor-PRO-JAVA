

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
  meta: number;
  anotacoes?: string;
  status: 'Pendente' | 'Em andamento' | 'Concluída';
  tags: string[];
  // Campos opcionais para registro de desempenho integrado
  acertos?: number;
  total?: number;
  tempo?: number;
}

export interface Flashcard {
  id: string;
  user_id: string;
  concurso?: string;
  materia: string;
  assunto?: string;
  front: string;
  back: string;
  ai_generated_assets?: any;
  original_audio_id?: string;
  author_name?: string; // NOVO
  status: 'novo' | 'aprendendo' | 'revisando' | 'aprendido' | 'revisar' | 'pendente'; // ATUALIZADO
  next_review: string;
  interval: number;
  ease_factor: number;
  created_at?: string; // NOVO
}

export interface Discursiva {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  prompt?: string; // NOVO: Enunciado da questão
  image_url: string;
  analysis_text: string;
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

export type ViewType = 'HOME' | 'REGISTRAR' | 'DASHBOARD' | 'EDITAL' | 'REVISOES' | 'GUIA_SEMANAL' | 'QUESTOES' | 'HISTORICO' | 'SIMULADOS' | 'CONFIGURAR' | 'REGISTRAR_SIMULADO' | 'RELATORIOS' | 'FLASHCARDS' | 'DISCURSIVA' | 'GABARITO_IA';