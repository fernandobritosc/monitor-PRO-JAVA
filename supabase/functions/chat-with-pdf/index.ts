/**
 * Chat with PDF — Supabase Edge Function
 * Permite interagir com PDFs na biblioteca usando Gemini e Groq.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// unpdf é otimizada para serverless/Deno e não usa o 'fs' do Node
import { extractText } from "https://esm.sh/unpdf@0.10.0";

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

function parseJwtUserId(token: string): string | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        return payload.sub || payload.id;
    } catch (e) {
        console.error("JWT Decode error:", e);
        return null;
    }
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
        if (req.method !== "POST") return await flushAndReturn({ error: "Method not allowed" }, 405);

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return await flushAndReturn({ error: "Missing Auth header" }, 401);

        const token = authHeader.replace("Bearer ", "").trim();
        const userId = parseJwtUserId(token);
        if (!userId) return await flushAndReturn({ error: "Invalid token" }, 401);

        console.log(`[AUTH] User: ${userId}`);
        const bodyRaw = await req.text();
        const { materialId, message, provider = "gemini" } = JSON.parse(bodyRaw) as ChatRequest;

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: material, error: matError } = await supabase
            .from("study_materials")
            .select("*")
            .eq("id", materialId)
            .eq("user_id", userId)
            .single();

        if (matError || !material) return await flushAndReturn({ error: "Material invalid" }, 404);

        console.log(`[STORAGE] Downloading...`);
        const { data: fileData, error: storageError } = await supabase.storage
            .from("study-materials")
            .download(material.storage_path);

        if (storageError || !fileData) return await flushAndReturn({ error: "Download fail" }, 500);

        if (provider === "gemini") {
            const apiKey = Deno.env.get("GEMINI_API_KEY");
            const arrayBuffer = await fileData.arrayBuffer();
            const base64PDF = arrayBufferToBase64(arrayBuffer);

            console.log(`[AI] Calling Gemini...`);
            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Você é um tutor de alto nível. Baseado no PDF anexo, responda técnica e didaticamente o usuário: ${message}` },
                                { inline_data: { mime_type: "application/pdf", data: base64PDF } }
                            ]
                        }]
                    })
                }
            );

            const result = await geminiResponse.json();
            if (result.error) return await flushAndReturn({ error: result.error.message }, 502);

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
            return await flushAndReturn({ text }, 200);
        }

        if (provider === "groq") {
            const apiKey = Deno.env.get("GROQ_API_KEY");
            if (!apiKey) return await flushAndReturn({ error: "Groq API key não configurada" }, 500);

            console.log(`[AI] Extraindo texto do PDF para Groq...`);
            const arrayBuffer = await fileData.arrayBuffer();
            // unpdf extrai texto de forma segura e sem Node dependencies
            const { text: extractedText } = await extractText(new Uint8Array(arrayBuffer));

            console.log(`[AI] Texto extraído (${extractedText?.length || 0} chars). Chamando Groq...`);

            // Truncar texto se for MUITO grande (ex: max 15000 chars para manter tokens seguros na cota free de 12k TPM)
            const safeText = (extractedText || "").length > 15000 ? extractedText.substring(0, 15000) + "..." : extractedText;

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
                            content: `Você é um tutor de alto nível para estudantes de concursos. Use o CONTEXTO abaixo para responder à dúvida do aluno.
                            
                            CONTEXTO DO MATERIAL:
                            ---
                            ${safeText}
                            ---
                            `
                        },
                        { role: "user", content: message },
                    ],
                    temperature: 0.5,
                    max_tokens: 2000,
                }),
            });

            const result = await groqResponse.json();
            if (result.error) {
                console.error("[AI ERROR] Groq:", result.error.message);
                return await flushAndReturn({ error: result.error.message }, 502);
            }

            const text = result.choices?.[0]?.message?.content || "Sem resposta do Groq.";
            return await flushAndReturn({ text }, 200);
        }

        return await flushAndReturn({ error: "Provedor não suportado" }, 400);

    } catch (err: any) {
        console.error("[FATAL]", err);
        return await flushAndReturn({ error: err.message }, 500);
    }
});
