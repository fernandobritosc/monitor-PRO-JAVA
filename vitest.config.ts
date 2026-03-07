import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        // Inclui apenas testes do projeto, exclui e2e (Playwright) e diretórios externos
        include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
        exclude: [
            'node_modules/**',
            'dist/**',
            'e2e/**',
            'antigravity-awesome-skills-main/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['hooks/**', 'services/**', 'utils/**'],
            exclude: ['node_modules/**', 'dist/**'],
        },
    },
    resolve: {
        alias: {
            // Permite importar dompurify sem problemas
            'dompurify': 'dompurify/dist/purify.js',
        },
    },
});
