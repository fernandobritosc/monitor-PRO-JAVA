

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