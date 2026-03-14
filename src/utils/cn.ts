import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitário para combinar classes Tailwind de forma inteligente
 * Combina clsx e tailwind-merge (obrigatório conforme AGENTS.md)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
