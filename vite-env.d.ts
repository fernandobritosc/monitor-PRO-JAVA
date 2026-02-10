
<<<<<<< HEAD
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Declarações para evitar erro "Could not find a declaration file for module"
// Simplificado para evitar conflitos com tipos existentes
declare module 'jspdf';

declare module 'jspdf-autotable' {
  const autoTable: (doc: any, options: any) => void;
  export default autoTable;
}
=======

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_API_KEY?: string;
  readonly GROQ_API_KEY?: string;
  readonly GOOGLE_API_KEY?: string;
  readonly API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Globals definidos no vite.config.ts via "define"
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_KEY__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __APP_VERSION__: string;

// Augment NodeJS ProcessEnv to include API keys without redeclaring 'process'
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
  }
}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
