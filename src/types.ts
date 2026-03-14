

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
  meta?: string | number | null;
  gabarito?: string;
  minha_resposta?: string;
  analise_erros?: ErrorAnalysis[]; // Qualitativo: O "porquê" do erro
}

export interface ErrorAnalysis {
  id: string; // Identificador único para persistência e filtros
  questao_preview: string;
  enunciado_completo?: string;
  tipo_erro: 'Atenção' | 'Lacuna de Base' | 'Interpretação';
  gatilho: string;
  sugestao: string;
  sugestao_mentor?: string;
  gabarito?: string;
  minha_resposta?: string;
  resolved?: boolean; // Novo: Se foi corrigido no Modo de Recuperação
  failed_attempts?: number; // Novo: Quantas vezes errou NOVAMENTE
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
  enunciado?: string; // NOVO: Texto rico Tiptap
  resposta?: string;  // NOVO: Texto rico Tiptap
  anotacoes?: string;
  status: 'Pendente' | 'Revisado' | 'Dominado';
  tags?: string[];
  meta: number;
  next_review?: string; // NOVO: SRS
  interval?: number;    // NOVO: SRS
  tec_id?: string;      // ID do Tec Concursos
  banca?: string;       // Ex: CESPE, FCC, FGV
  ano?: number;
  tipo?: 'Multipla Escolha' | 'Certo/Errado';
  alternativas?: {
    id: string;
    texto: string;
    label: string; // A, B, C, D, E ou Certo, Errado
    is_correct: boolean;
  }[];
  images?: string[]; // URLs de imagens no enunciado/alternativas
  ai_generated_assets?: {
    explanation?: string;
    mnemonic?: string;
    mapa?: string;
    fluxo?: string;
    tabela?: string;
    info?: string;
    [key: string]: string | undefined;
  };
  original_audio_id?: string;
}

export interface GlobalQuestion extends Omit<Question, 'user_id' | 'status' | 'meta' | 'next_review' | 'interval'> {
  orgao?: string;
  cargo?: string;
  created_by: string; // Admin ID
}

export interface QuestionAttempt {
  id?: string;
  question_id: string;
  user_id: string;
  selected_alt: string;
  is_correct: boolean;
  attempted_at?: string;
  materia?: string;
  assunto?: string;
  banca?: string;
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

export interface Flashcard {
  id: string;
  user_id: string;
  materia: string;
  assunto: string;
  front: string;
  back: string;
  status: 'novo' | 'revisando' | 'aprendido' | 'pendente';
  interval?: number;
  ease_factor?: number;
  next_review?: string;
  created_at?: string;
  original_audio_id?: string;
  author_name?: string;
  ai_generated_assets?: {
    explanation?: string;
    mnemonic?: string;
    mapa?: string;
    tabela?: string;
    fluxo?: string;
    info?: string;
    [key: string]: string | undefined;
  };
}

export interface Discursiva {
  id: string;
  user_id: string;
  title: string;
  prompt?: string;
  image_url: string;
  analysis_text: string;
  created_at: string;
}

export type ViewType = 'HOME' | 'DASHBOARD' | 'EDITAL' | 'QUESTOES' | 'REGISTRAR' | 'REVISOES' | 'HISTORICO' | 'SIMULADOS' | 'CONFIGURAR' | 'RELATORIOS' | 'ONBOARDING' | 'EDITAL_PROGRESS' | 'FLASHCARDS' | 'DISCURSIVA' | 'GABARITO_IA' | 'ANALISE_ERROS' | 'REGISTRAR_SIMULADO' | 'HUB' | 'RANKING' | 'PERFORMANCE' | 'CADASTRO_QUESTOES' | 'LIBRARY';