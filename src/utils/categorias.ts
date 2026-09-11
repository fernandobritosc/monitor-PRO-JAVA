export const BASE_CATEGORIAS = ['Teoria', 'Revisão', 'Questões', 'Teoria e Questão'];
export const NOVA_CATEGORIA = 'Nova Categoria';

export const categoriasKey = (userId: string | undefined) =>
  `monitorpro_categorias_${userId || 'anon'}`;

export const loadCustomCategorias = (userId: string | undefined): string[] => {
  try {
    const raw = localStorage.getItem(categoriasKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
};

export const saveCustomCategorias = (userId: string | undefined, list: string[]) => {
  try {
    localStorage.setItem(categoriasKey(userId), JSON.stringify(list));
  } catch {
    // armazenamento indisponível: segue sem persistir
  }
};

export const mergeCategorias = (customs: string[]): string[] => [
  ...BASE_CATEGORIAS,
  ...customs.filter((c) => !BASE_CATEGORIAS.includes(c)),
  NOVA_CATEGORIA,
];

export const isCustomCategoria = (name: string) =>
  name !== NOVA_CATEGORIA && !BASE_CATEGORIAS.includes(name);

/** Detecta simulado pelo tipo OU pelo nome da matéria (o banco tem
 *  registros antigos com materia='SIMULADO' mas tipo='Estudo') */
export const isSimuladoRecord = (r: { tipo?: string | null; materia?: string }) =>
  (r.tipo || '') === 'Simulado' || (r.materia || '').trim().toLowerCase() === 'simulado';
