/**
 * Chat with PDF — Supabase Edge Function
 * Permite interagir com PDFs na biblioteca usando Gemini e Groq.
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

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Authorization header required" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { materialId, message, provider = "gemini", stream = false } = await req.json() as ChatRequest;

        // 1. Buscar metadados do material
        const { data: material, error: matError } = await supabase
            .from("study_materials")
            .select("*")
            .eq("id", materialId)
            .eq("user_id", user.id)
            .single();

        if (matError || !material) return new Response("Material not found", { status: 404, headers: corsHeaders });

        // 2. Obter o arquivo do Storage
        const { data: fileData, error: storageError } = await supabase.storage
            .from("study-materials")
            .download(material.storage_path);

        if (storageError || !fileData) return new Response("Error downloading file", { status: 500, headers: corsHeaders });

        if (provider === "gemini") {
            const apiKey = Deno.env.get("GEMINI_API_KEY")!;
            const arrayBuffer = await fileData.arrayBuffer();
            const base64PDF = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Você é um tutor de alto nível para concursos públicos. Baseado no PDF anexo, responda de forma técnica e didática à seguinte dúvida/solicitação do estudante: ${message}` },
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
                throw new Error(result.error.message || "Erro na API do Gemini");
            }

            // Retorna o formato simplificado para o frontend
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

            return new Response(JSON.stringify({ text }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // TODO: Implementar Groq com extração de texto (precisa de lib de PDF extra)
        return new Response(JSON.stringify({ error: "Provider Groq ainda em desenvolvimento para PDF" }), {
            status: 501,
            headers: corsHeaders
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
});
