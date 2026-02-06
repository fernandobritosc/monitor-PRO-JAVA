
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
  concurso?: string; // Agora opcional/global
  materia: string;
  assunto?: string; // Novo campo
  front: string;
  back: string;
  ai_explanation?: string; // Persiste a explicação da IA
  original_audio_id?: string; // NOVO: Aponta para o ID do card original que gerou o áudio
  status: 'novo' | 'aprendendo' | 'revisando';
  next_review: string;
  interval: number;
  ease_factor: number;
}

export interface Discursiva {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  image_url: string;
  analysis_text: string;
}

export type ViewType = 'HOME' | 'REGISTRAR' | 'DASHBOARD' | 'EDITAL' | 'REVISOES' | 'GUIA_SEMANAL' | 'QUESTOES' | 'HISTORICO' | 'SIMULADOS' | 'CONFIGURAR' | 'REGISTRAR_SIMULADO' | 'RELATORIOS' | 'FLASHCARDS' | 'DISCURSIVA';