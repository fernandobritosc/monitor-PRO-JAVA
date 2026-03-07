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
    const chunkSize = 8192; // Chunk seguro contra Stack Overflow
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
}

// Decode JWT without external HTTP database call (avoids EarlyDrop timeout)
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

// Ensure logs flush
const flushAndReturn = async (body: any, status: number) => {
    console.log(`[EXIT] Returning status ${status}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
};

serve(async (req: Request) => {
    console.log(`[BOOT] Request: ${req.method}`);
    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

    try {
        if (req.method !== "POST") return await flushAndReturn({ error: "Method not allowed" }, 405);

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return await flushAndReturn({ error: "Missing Authorization header" }, 401);

        console.log(`[AUTH] Extrating JWT locally`);
        const token = authHeader.replace("Bearer ", "").trim();
        const userId = parseJwtUserId(token);

        if (!userId) {
            console.error(`[AUTH FATAL] Invalid JWT payload`);
            return await flushAndReturn({ error: "Invalid token payload" }, 401);
        }

        console.log(`[AUTH] Success for user: ${userId}. Parsing body...`);
        const bodyRaw = await req.text();
        const { materialId, message, provider = "gemini" } = JSON.parse(bodyRaw) as ChatRequest;

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        // USANDO SERVICE ROLE: Ignorar bloqueios RLS para downloads restritos. RLS validado logicamente.
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        console.log(`[STORAGE] Querying DB for material ${materialId}`);
        const { data: material, error: matError } = await supabaseAdmin
            .from("study_materials")
            .select("*")
            .eq("id", materialId)
            // Lógica essencial: garantir que o usuário dono do token é o dono do arquivo
            .eq("user_id", userId)
            .single();

        if (matError || !material) {
            console.error("[STORAGE FATAL] Failed/access denied:", matError);
            return await flushAndReturn({ error: "Material não encontrado ou sem acesso" }, 404);
        }

        console.log(`[STORAGE] Downloading ${material.storage_path}`);
        const { data: fileData, error: storageError } = await supabaseAdmin.storage
            .from("study-materials")
            .download(material.storage_path);

        if (storageError || !fileData) {
            console.error("[STORAGE FATAL] Download falhou:", storageError);
            return await flushAndReturn({ error: "Falha ao acessar PDF no bucket" }, 500);
        }

        if (provider === "gemini") {
            const apiKey = Deno.env.get("GEMINI_API_KEY");
            if (!apiKey) return await flushAndReturn({ error: "API Key ausente no painel" }, 500);

            console.log(`[AI] Encoding file (${fileData.size} bytes) to Base64`);
            const arrayBuffer = await fileData.arrayBuffer();
            const base64PDF = arrayBufferToBase64(arrayBuffer);

            console.log(`[AI] Sending prompt to Gemini...`);
            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Você é um tutor de alto nível. Baseado SOMENTE no PDF anexo, responda técnica e didaticamente o usuário: ${message}` },
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

            console.log(`[AI] Response status: ${geminiResponse.status}`);
            const result = await geminiResponse.json();

            if (result.error) {
                console.error("[AI ERROR] Gemini:", result.error.message);
                return await flushAndReturn({ error: result.error.message }, 502);
            }

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
            console.log(`[AI] Success. Output length: ${text.length}`);
            return await flushAndReturn({ text }, 200);
        }

        return await flushAndReturn({ error: "Groq não suportado para PDF multimodal no momento" }, 501);

    } catch (err: any) {
        console.error("[FATAL CRASH]", err);
        return await flushAndReturn({ error: err.message }, 500);
    }
});
