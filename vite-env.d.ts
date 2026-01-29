
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
