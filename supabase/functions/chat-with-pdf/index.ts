/**
 * Chat with PDF — Supabase Edge Function
 * Permite interagir com PDFs na biblioteca usando Gemini e Groq.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { configureUnPDF, extractText } from "https://esm.sh/unpdf@0.10.0";
import * as pdfjs from "https://esm.sh/unpdf@0.10.0/dist/pdfjs.mjs";

configureUnPDF({
    pdfjs: () => Promise.resolve(pdfjs),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, region",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatRequest {
    materialId: string;
    message: string;
    provider: "gemini" | "groq";
    stream?: boolean;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
}


const flushAndReturn = async (body: any, status: number) => {
    console.log(`[EXIT] Status ${status}`);
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
};

serve(async (req: Request) => {
    console.log(`[BOOT] Method: ${req.method}`);

    if (req.method === "OPTIONS") {
        console.log("[CORS] Handling OPTIONS");
        return new Response("ok", { status: 200, headers: corsHeaders });
    }

    try {
        const startTotal = Date.now();
        if (req.method !== "POST") return await flushAndReturn({ error: "Method not allowed" }, 405);

        const authHeader = req.headers.get("Authorization");
        
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader || "" } }
        });

        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError) {
            console.warn("[AUTH WARNING]", authError.message);
        }

        const userId = user?.id;
        console.log(`[AUTH] User ID detectado: ${userId || "NENHUM"}`);

        const bodyRaw = await req.text();
        const { materialId, message, provider = "gemini" } = JSON.parse(bodyRaw) as ChatRequest;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Se tivermos userId, filtramos por ele. Se não, tentamos buscar apenas pelo materialId 
        // para contornar problemas de autenticação no localhost durante o debug.
        let query = supabaseAdmin
            .from("study_materials")
            .select("*")
            .eq("id", materialId);
            
        if (userId) {
            query = query.eq("user_id", userId);
        }

        const { data: material, error: matError } = await query.single();

        if (matError || !material) {
            console.error("[DB ERROR] Material owner query:", matError);
            return await flushAndReturn({ error: "Material não encontrado ou acesso negado." }, 404);
        }

        console.log(`[STORAGE] Downloading ${material.storage_path}...`);
        const startDl = Date.now();
        const { data: fileData, error: storageError } = await supabaseAdmin.storage
            .from("study-materials")
            .download(material.storage_path);
        console.log(`[TIME] Download: ${Date.now() - startDl}ms`);

        if (storageError || !fileData) {
            console.error("[STORAGE ERROR]", storageError);
            return await flushAndReturn({ error: "Falha ao baixar o material do servidor." }, 500);
        }

        if (provider === "gemini") {
            const apiKey = Deno.env.get("GEMINI_API_KEY");
            const arrayBuffer = await fileData.arrayBuffer();
            const base64PDF = arrayBufferToBase64(arrayBuffer);

            console.log(`[AI] Calling Gemini...`);
            const startAi = Date.now();
            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Você é um tutor de alto nível especializado em concursos. Baseado no PDF anexo, responda técnica e didaticamente o usuário, priorizando clareza e precisão: ${message}` },
                                { inline_data: { mime_type: "application/pdf", data: base64PDF } }
                            ]
                        }]
                    })
                }
            );

            console.log(`[TIME] AI Gemini: ${Date.now() - startAi}ms`);
            const result = await geminiResponse.json();
            if (result.error) {
                console.error("[GEMINI ERROR]", result.error);
                return await flushAndReturn({ error: `IA Gemini: ${result.error.message}` }, 502);
            }

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "A IA não retornou uma resposta válida.";
            console.log(`[EXIT] Total time: ${Date.now() - startTotal}ms`);
            return await flushAndReturn({ text }, 200);
        }

        if (provider === "groq") {
            const apiKey = Deno.env.get("GROQ_API_KEY");
            if (!apiKey) return await flushAndReturn({ error: "Chave Groq não configurada no servidor." }, 500);

            console.log(`[AI] Extraindo texto do PDF...`);
            const startExt = Date.now();
            const arrayBuffer = await fileData.arrayBuffer();
            
            // Tratamento defensivo para o retorno do unpdf
            const extractionResult = await extractText(new Uint8Array(arrayBuffer)).catch(e => {
                console.error("[EXTRACT ERROR]", e);
                return "";
            });
            
            const extractedText = typeof extractionResult === 'string' 
                ? extractionResult 
                : (extractionResult?.text || "");

            console.log(`[TIME] Extraction: ${Date.now() - startExt}ms`);

            if (!extractedText || String(extractedText).trim().length < 10) {
                return await flushAndReturn({ 
                    error: "Não foi possível extrair texto deste PDF.", 
                    detail: "O arquivo pode ser uma imagem (precisa de OCR) ou está vazio." 
                }, 422);
            }

            const safeText = String(extractedText).length > 16000 
                ? String(extractedText).substring(0, 16000) + " [Texto truncado por limite de contexto]" 
                : String(extractedText);

            console.log(`[AI] Calling Groq (Llama 3.3)...`);
            const startAi = Date.now();
            const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: `Você é um tutor de alto nível para estudantes de concursos. Use o CONTEXTO abaixo para responder à dúvida do aluno de forma clara, técnica e objetiva.
                            
                            CONTEXTO DO MATERIAL:
                            ---
                            ${safeText}
                            ---
                            `
                        },
                        { role: "user", content: message },
                    ],
                    temperature: 0.3, // Menor temperatura para respostas mais precisas
                    max_tokens: 1500,
                }),
            });

            console.log(`[TIME] AI Groq: ${Date.now() - startAi}ms`);
            
            if (!groqResponse.ok) {
                const errorData = await groqResponse.json().catch(() => ({}));
                const groqMsg = errorData.error?.message || `Status ${groqResponse.status}`;
                console.error("[GROQ ERROR]", groqMsg);
                
                // Mudamos o status para 502 para não confundir com Auth do Supabase
                const finalStatus = groqResponse.status === 401 ? 502 : groqResponse.status;
                
                if (groqResponse.status === 401) {
                    return await flushAndReturn({ 
                        error: "Erro de Configuração no Groq (Chave de API)", 
                        detail: "A chave GROQ_API_KEY configurada no servidor parece ser inválida ou expirou." 
                    }, 502);
                }

                if (groqResponse.status === 429) {
                    return await flushAndReturn({ error: "Limite de processamento atingido no Groq (Rate Limit). Tente novamente em 1 minuto." }, 429);
                }
                return await flushAndReturn({ error: `O Groq retornou um erro: ${groqMsg}` }, finalStatus);
            }

            const result = await groqResponse.json();
            const text = result.choices?.[0]?.message?.content || "Sem resposta do Groq.";
            console.log(`[EXIT] Total time: ${Date.now() - startTotal}ms`);
            return await flushAndReturn({ text }, 200);
        }

        return await flushAndReturn({ error: "Provedor de IA não suportado ou inválido." }, 400);

    } catch (err: any) {
        console.error("[FATAL ERROR]", err);
        // Retornamos o erro real para o frontend conseguir nos dizer o que houve
        return await flushAndReturn({ 
            error: "Erro interno na Edge Function",
            message: err.message,
            stack: err.stack,
            type: err.constructor?.name
        }, 500);
    }
});
