/**
 * AI Gateway — Supabase Edge Function
 * Proxy seguro para chamadas de IA (Gemini e Groq)
 *
 * Benefícios:
 * - API keys nunca expostas no frontend
 * - Rate limiting centralizado no servidor
 * - Logging de uso por usuário
 * - Controle de custos
 *
 * Deploy: supabase functions deploy ai-gateway
 * URL: https://<project>.supabase.co/functions/v1/ai-gateway
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================
// Tipos
// ============================================================

interface AIRequest {
    provider: "gemini" | "groq";
    prompt: string;
    model?: string;
    context?: "flashcard" | "general" | "mapa" | "tabela" | "fluxo" | "info" | "analise_erros" | "macro_diagnostico";
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
}

interface RateLimitRecord {
    user_id: string;
    minute_count: number;
    hour_count: number;
    last_minute_reset: string;
    last_hour_reset: string;
    total_today: number;
}

// ============================================================
// CORS Headers
// ============================================================

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// Rate Limiting (server-side)
// ============================================================

const MAX_PER_MINUTE = 10;
const MAX_PER_HOUR = 60;

async function checkServerRateLimit(
    supabase: ReturnType<typeof createClient>,
    userId: string
): Promise<{ allowed: boolean; message?: string }> {
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000).toISOString();
    const hourAgo = new Date(now.getTime() - 3600000).toISOString();

    try {
        // Busca registro de rate limit do usuário
        const { data, error } = await supabase
            .from("ai_rate_limits")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (error && error.code !== "PGRST116") {
            // PGRST116 = Not Found, ok criar novo
            console.error("Rate limit DB error:", error);
            return { allowed: true }; // Fail open para não bloquear usuários legítimos
        }

        const record: RateLimitRecord = data ?? {
            user_id: userId,
            minute_count: 0,
            hour_count: 0,
            last_minute_reset: now.toISOString(),
            last_hour_reset: now.toISOString(),
            total_today: 0,
        };

        // Refil por minuto
        if (new Date(record.last_minute_reset) < new Date(minuteAgo)) {
            record.minute_count = 0;
            record.last_minute_reset = now.toISOString();
        }

        // Refil por hora
        if (new Date(record.last_hour_reset) < new Date(hourAgo)) {
            record.hour_count = 0;
            record.last_hour_reset = now.toISOString();
        }

        // Verifica limites
        if (record.minute_count >= MAX_PER_MINUTE) {
            return { allowed: false, message: `Rate limit: máximo ${MAX_PER_MINUTE} chamadas por minuto` };
        }

        if (record.hour_count >= MAX_PER_HOUR) {
            return { allowed: false, message: `Rate limit: máximo ${MAX_PER_HOUR} chamadas por hora` };
        }

        // Incrementa contadores
        record.minute_count += 1;
        record.hour_count += 1;
        record.total_today += 1;

        // Persiste no banco
        await supabase.from("ai_rate_limits").upsert({
            ...record,
            updated_at: now.toISOString(),
        });

        return { allowed: true };
    } catch (err) {
        console.error("Rate limit check exception:", err);
        return { allowed: true }; // Fail open
    }
}

// ============================================================
// Chamadas de IA
// ============================================================

async function callGemini(
    apiKey: string,
    prompt: string,
    model: string = "gemini-2.0-flash",
    maxTokens: number = 8192,
    temperature: number = 0.7,
    stream: boolean = false
): Promise<Response> {
    const endpoint = stream
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
        },
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    return response;
}

async function callGroq(
    apiKey: string,
    prompt: string,
    model: string = "llama-3.3-70b-versatile",
    maxTokens: number = 8192,
    temperature: number = 0.7,
    stream: boolean = false
): Promise<Response> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "Você é um especialista em concursos públicos. Seja direto e técnico.",
                },
                { role: "user", content: prompt },
            ],
            temperature,
            max_tokens: maxTokens,
            stream,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }

    return response;
}

// ============================================================
// Handler Principal
// ============================================================

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        // 1. Autenticar usuário via JWT do Supabase
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Authorization header required" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Rate Limiting server-side
        const rateLimitResult = await checkServerRateLimit(supabase, user.id);
        if (!rateLimitResult.allowed) {
            return new Response(
                JSON.stringify({ error: rateLimitResult.message || "Rate limit exceeded" }),
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "Retry-After": "60",
                    },
                }
            );
        }

        // 3. Parse request body
        const body: AIRequest = await req.json();
        const { provider, prompt, model, context, stream = false, maxTokens = 8192, temperature = 0.7 } = body;

        if (!provider || !prompt) {
            return new Response(JSON.stringify({ error: "provider e prompt são obrigatórios" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (prompt.length > 32000) {
            return new Response(JSON.stringify({ error: "Prompt muito longo (max 32000 chars)" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Obter API Keys dos secrets do Supabase (NUNCA expostas no frontend!)
        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        const groqKey = Deno.env.get("GROQ_API_KEY");

        if (provider === "gemini" && !geminiKey) {
            return new Response(JSON.stringify({ error: "Gemini API key não configurada" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (provider === "groq" && !groqKey) {
            return new Response(JSON.stringify({ error: "Groq API key não configurada" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 5. Log de uso (assíncrono, sem bloquear resposta)
        const logUsage = async () => {
            try {
                await supabase.from("ai_usage_logs").insert({
                    user_id: user.id,
                    provider,
                    model: model || (provider === "gemini" ? "gemini-2.0-flash" : "llama-3.3-70b-versatile"),
                    context,
                    prompt_length: prompt.length,
                    created_at: new Date().toISOString(),
                });
            } catch (e) {
                console.warn("Log usage failed:", e);
            }
        };

        // 6. Chamar a API de IA
        let aiResponse: Response;

        try {
            if (provider === "gemini") {
                aiResponse = await callGemini(geminiKey!, prompt, model, maxTokens, temperature, stream);
            } else {
                aiResponse = await callGroq(groqKey!, prompt, model, maxTokens, temperature, stream);
            }
        } catch (aiError: any) {
            console.error(`AI call failed (${provider}):`, aiError.message);

            // Fallback automático: Se Gemini falhar, tenta Groq
            if (provider === "gemini" && groqKey) {
                console.log("Tentando fallback para Groq...");
                try {
                    aiResponse = await callGroq(groqKey, prompt, undefined, maxTokens, temperature, stream);
                } catch (fallbackError: any) {
                    return new Response(
                        JSON.stringify({ error: `Ambos os provedores falharam: ${fallbackError.message}` }),
                        {
                            status: 503,
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        }
                    );
                }
            } else {
                return new Response(JSON.stringify({ error: aiError.message }), {
                    status: 503,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // Log em background
        logUsage();

        // 7. Retorna a resposta da IA com CORS headers
        const responseHeaders = {
            ...corsHeaders,
            "Content-Type": stream
                ? "text/event-stream"
                : (aiResponse.headers.get("Content-Type") || "application/json"),
        };

        return new Response(aiResponse.body, {
            status: aiResponse.status,
            headers: responseHeaders,
        });

    } catch (err: any) {
        console.error("AI Gateway unhandled error:", err);
        return new Response(
            JSON.stringify({ error: "Erro interno do servidor", detail: err.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
