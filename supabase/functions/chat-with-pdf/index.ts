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

        const apiKey = req.headers.get("apikey") || supabaseAnonKey;

        // Tenta obter o usuário mas não trava em caso de erro (debug mode)
        const authClient = createClient(supabaseUrl, apiKey, {
            global: { headers: { Authorization: authHeader || "" } }
        });

        const { data: { user }, error: authError } = await authClient.auth.getUser().catch(() => ({ data: { user: null }, error: null }));
        
        if (authError) console.warn("[AUTH WARNING]", authError.message);
        
        const userId = user?.id;
        console.log(`[AUTH] User ID: ${userId || "ANÔNIMO"} | Header: ${authHeader ? "Presente" : "Ausente"}`);

        const bodyRaw = await req.text();
        const { materialId, message, stream = true } = JSON.parse(bodyRaw) as ChatRequest;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
        const { data: fileData, error: storageError } = await supabaseAdmin.storage
            .from("study-materials")
            .download(material.storage_path);

        if (storageError || !fileData) {
            console.error("[STORAGE ERROR]", storageError);
            return await flushAndReturn({ error: "Falha ao baixar o material do servidor." }, 500);
        }

        // Provedor Único: Gemini (Multimodal Native)
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) return await flushAndReturn({ error: "Chave Gemini não configurada." }, 500);

        const arrayBuffer = await fileData.arrayBuffer();
        const base64PDF = arrayBufferToBase64(arrayBuffer);

        const geminiUrl = stream 
            ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${geminiApiKey}&alt=sse`
            : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Você é um tutor especialista em concursos. Responda de forma didática e técnica baseado no PDF anexado: ${message}` },
                        { inline_data: { mime_type: "application/pdf", data: base64PDF } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!stream) {
            const result = await geminiResponse.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na IA.";
            return await flushAndReturn({ text }, 200);
        }

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        (async () => {
            const reader = geminiResponse.body?.getReader();
            if (!reader) { writer.close(); return; }

            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const json = JSON.parse(line.substring(6));
                            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) await writer.write(encoder.encode(text));
                        } catch (_e) { }
                    }
                }
            }
            writer.close();
        })();

        return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

        return await flushAndReturn({ error: "Provedor não suportado." }, 400);

    } catch (err: any) {
        console.error("[FATAL ERROR]", err);
        return await flushAndReturn({ error: err.message }, 500);
    }
});
