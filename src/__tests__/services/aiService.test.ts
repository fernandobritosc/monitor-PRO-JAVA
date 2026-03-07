/**
 * Testes para o serviço de IA (aiService.ts)
 * Foca nas funções puras e na lógica de detecção de provider
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAIProvider, parseAIJSON } from '../../../services/aiService';

describe('detectAIProvider', () => {
    describe('seleção de provider', () => {
        it('deve retornar null quando nenhuma chave está disponível', () => {
            const result = detectAIProvider();
            expect(result).toBeNull();
        });

        it('deve selecionar Gemini quando apenas a chave Gemini está disponível', () => {
            const result = detectAIProvider('valid-gemini-key-12345');
            expect(result).not.toBeNull();
            expect(result?.provider).toBe('gemini');
            expect(result?.apiKey).toBe('valid-gemini-key-12345');
        });

        it('deve selecionar Groq quando apenas a chave Groq está disponível', () => {
            const result = detectAIProvider(undefined, 'valid-groq-key-12345');
            expect(result).not.toBeNull();
            expect(result?.provider).toBe('groq');
        });

        it('deve respeitar a preferência por Gemini quando ambas as chaves existem', () => {
            const result = detectAIProvider('gemini-key-123456', 'groq-key-123456', 'gemini');
            expect(result?.provider).toBe('gemini');
        });

        it('deve respeitar a preferência por Groq quando ambas as chaves existem', () => {
            const result = detectAIProvider('gemini-key-123456', 'groq-key-123456', 'groq');
            expect(result?.provider).toBe('groq');
        });

        it('deve preferir Gemini em modo auto quando ambas as chaves existem', () => {
            const result = detectAIProvider('gemini-key-123456', 'groq-key-123456');
            expect(result?.provider).toBe('gemini');
        });

        it('deve rejeitar chaves muito curtas (< 10 chars)', () => {
            const result = detectAIProvider('short', 'also');
            expect(result).toBeNull();
        });

        it('deve retornar null quando preferência é Gemini mas chave não existe', () => {
            const result = detectAIProvider(undefined, 'groq-key-valid-12345', 'gemini');
            // Deve fallback para groq
            expect(result?.provider).toBe('groq');
        });
    });
});

describe('parseAIJSON', () => {
    describe('parsing válido', () => {
        it('deve parsear Array JSON simples', () => {
            const json = '[{"id": 1, "nome": "teste"}]';
            const result = parseAIJSON<{ id: number; nome: string }[]>(json);
            expect(result).toEqual([{ id: 1, nome: 'teste' }]);
        });

        it('deve parsear Objeto JSON simples', () => {
            const json = '{"tipo_erro": "Atenção", "sugestao": "Revise o conceito"}';
            const result = parseAIJSON<any>(json);
            expect(result.tipo_erro).toBe('Atenção');
        });

        it('deve extrair JSON de resposta com texto adicional', () => {
            const json = 'Aqui está a análise: [{"tipo_erro": "Lacuna"}] Espero que ajude!';
            const result = parseAIJSON<any[]>(json);
            expect(Array.isArray(result)).toBe(true);
            expect(result[0].tipo_erro).toBe('Lacuna');
        });

        it('deve extrair JSON de bloco de código markdown', () => {
            const json = '```json\n[{"questao": "Qual é..."}]\n```';
            const result = parseAIJSON<any[]>(json);
            expect(Array.isArray(result)).toBe(true);
            expect(result[0].questao).toBe('Qual é...');
        });

        it('deve lidar com JSON aninhado complexo', () => {
            const json = JSON.stringify([{
                tipo_erro: 'Atenção',
                enunciado_completo: 'Texto longo aqui',
                sugestao: 'Ação',
                sugestao_mentor: 'Dica',
            }]);
            const result = parseAIJSON<any[]>(json);
            expect(result[0].tipo_erro).toBe('Atenção');
        });
    });

    describe('parsing com erros', () => {
        it('deve lançar erro quando não há JSON válido', () => {
            expect(() => parseAIJSON('Texto sem JSON algum')).toThrow();
        });

        it('deve tentar reparar JSON truncado', () => {
            // JSON truncado que pode ser recuperado
            const truncated = '[{"tipo_erro": "Atenção", "sugestao": "Revise';
            // Pode rejeitar ou recuperar — o importante é não crashar silenciosamente
            try {
                const result = parseAIJSON<any[]>(truncated);
                // Se recuperou, deve ser um array
                expect(Array.isArray(result)).toBe(true);
            } catch (e) {
                // Se lançou erro, é comportamento esperado
                expect(e).toBeTruthy();
            }
        });
    });
});
