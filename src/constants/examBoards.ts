export type ExamBoard = 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'PERSONALIZADO';

export interface BoardConfig {
  name: string;
  shortName: string;
  scoring: 'standard' | 'cespe';
  negativeMarking: boolean;
  negativeValue: number;
  alternatives: number;
  hasBlankOption: boolean;
  description: string;
}

export const EXAM_BOARDS: Record<ExamBoard, BoardConfig> = {
  CESPE: {
    name: 'CESPE / CEBRASPE',
    shortName: 'CESPE',
    scoring: 'cespe',
    negativeMarking: true,
    negativeValue: 1.0,
    alternatives: 2,
    hasBlankOption: true,
    description: 'Certo/Errado. Perde pontos se errar. Deixar em branco não pontua.',
  },
  FCC: {
    name: 'FCC',
    shortName: 'FCC',
    scoring: 'standard',
    negativeMarking: false,
    negativeValue: 0,
    alternatives: 5,
    hasBlankOption: false,
    description: 'Múltipla escolha (5 alternativas). Sem peso negativo.',
  },
  FGV: {
    name: 'FGV',
    shortName: 'FGV',
    scoring: 'standard',
    negativeMarking: false,
    negativeValue: 0,
    alternatives: 4,
    hasBlankOption: false,
    description: 'Múltipla escolha (4 alternativas). Sem peso negativo.',
  },
  VUNESP: {
    name: 'VUNESP',
    shortName: 'VUNESP',
    scoring: 'standard',
    negativeMarking: false,
    negativeValue: 0,
    alternatives: 5,
    hasBlankOption: false,
    description: 'Múltipla escolha (5 alternativas). Sem peso negativo.',
  },
  PERSONALIZADO: {
    name: 'Personalizado',
    shortName: 'Custom',
    scoring: 'standard',
    negativeMarking: false,
    negativeValue: 0,
    alternatives: 5,
    hasBlankOption: false,
    description: 'Configuração livre.',
  },
};
