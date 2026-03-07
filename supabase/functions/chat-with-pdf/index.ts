/**
 * Chat with PDF — Supabase Edge Function
 * Permite interagir com PDFs na biblioteca usando Gemini.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const chunkSize = 8192; // Chunk seguro para não estourar a call stack
    for (let i = 0; i < len; i += chunkSize) {
        // Converte subarray para Array normal pois reduce/apply com subarray em browsers antigos pode dar erro, 
        // mas no Deno Array.from garante compatibilidade.
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Faltando header de Authorization" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // Inicializa com chave Root mas desativa coisas locais do Edge
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Pega o usuário logado com base no token que recebemos
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized", details: authError }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const bodyRaw = await req.text();
        const { materialId, message, provider = "gemini", stream = false } = JSON.parse(bodyRaw) as ChatRequest;

        // 1. Buscar metadados do material
        const { data: material, error: matError } = await supabase
            .from("study_materials")
            .select("*")
            .eq("id", materialId)
            .eq("user_id", user.id)
            .single();

        if (matError || !material) {
            return new Response(JSON.stringify({ error: "Material não encontrado ou acesso negado." }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 2. Obter o arquivo do Storage
        const { data: fileData, error: storageError } = await supabase.storage
            .from("study-materials")
            .download(material.storage_path);

        if (storageError || !fileData) {
            return new Response(JSON.stringify({ error: "Erro ao baixar arquivo do servidor.", details: storageError }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (provider === "gemini") {
            const apiKey = Deno.env.get("GEMINI_API_KEY");
            if (!apiKey) {
                return new Response(JSON.stringify({ error: "Chave Gemini não configurada no Supabase." }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // Conversão buffer seguro para PDFs grandes
            const arrayBuffer = await fileData.arrayBuffer();
            const base64PDF = arrayBufferToBase64(arrayBuffer);

            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Você é um tutor de alto nível para concursos públicos. Baseado EXCLUSIVAMENTE no PDF anexo (analise as páginas, tabelas e gráficos), responda de forma técnica, focada e didática à seguinte dúvida/solicitação do estudante: ${message}. Se não encontrar no PDF, informe isso.` },
                                {
                                    inline_data: {
                                        mime_type: "application/pdf",
                                        data: base64PDF
                                    }
                                }
                            ]
                        }]
                    })
                }
            );

            const result = await geminiResponse.json();

            if (result.error) {
                return new Response(JSON.stringify({ error: result.error.message || "Erro na API do Gemini" }), {
                    status: 502,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // Retorna o formato simplificado para o frontend
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

            return new Response(JSON.stringify({ text }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Caso tente usar groq sem texto puro
        return new Response(JSON.stringify({ error: "Provider Groq suporta apenas extração de texto que ainda será ativada." }), {
            status: 501,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "Erro interno no processamento.", details: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
