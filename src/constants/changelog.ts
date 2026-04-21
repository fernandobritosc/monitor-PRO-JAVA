export interface AppRelease {
  version: string;
  date: string;
  time: string;
  description: string;
  features: string[];
}

export const APP_RELEASES: AppRelease[] = [
  {
    version: "1.0.31",
    date: "20/04/2026",
    time: "21:00",
    description: "Implementação de Controle Rigoroso de Release e Histórico.",
    features: [
      "Inclusão de Workflow interno de Versionamento (/release).",
      "Novo Portal/Modal de Histórico (Changelog) para consultar novidades do sistema.",
      "Proteção de Publicação: Alterações oficiais agora exigem aprovação humana (Socratic Gate).",
      "Correções na performance e otimização do repositório `.gitignore`."
    ]
  },
  {
    version: "1.0.30",
    date: "15/04/2026",
    time: "10:30",
    description: "Ajustamentos de Performance e Bug Fixes Menores.",
    features: [
      "Otimização no carregamento de estados usando Zustand.",
      "Melhorias de responsividade na interface do Dashboard Principal."
    ]
  },
  {
    version: "1.0.28",
    date: "05/04/2026",
    time: "14:15",
    description: "Novo Motor de Inteligência para Mapeamento Global.",
    features: [
      "Criação das visões baseadas na seleção de 'Escolha a sua Missão'.",
      "HeatMap: Gráficos de atividade de tempo desenvolvidos nos relatórios."
    ]
  }
];
