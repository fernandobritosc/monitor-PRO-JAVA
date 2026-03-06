import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Target {
    url: string;
    name: string;
}

interface NewsItem {
    title: string;
    summary: string;
    source_url?: string;
    tags?: string[];
}

// Add new targets here
const TARGETS: Target[] = [
    { url: "https://www.pciconcursos.com.br/noticias/", name: "PCI Concursos" },
    { url: "https://www.estrategiaconcursos.com.br/blog/tribunais/", name: "Estratégia (Tribunais)" },
    { url: "https://www.estrategiaconcursos.com.br/blog/controle-gestao/", name: "Estratégia (Controle e Gestão)" },
    { url: "https://www.estrategiaconcursos.com.br/blog/tribunais-de-contas/", name: "Estratégia (Tribunais de Contas)" },
    { url: "https://blog.grancursosonline.com.br/editorias/tribunais/", name: "Gran Cursos (Tribunais)" },
    { url: "https://blog.grancursosonline.com.br/editorias/concurso-juridico/", name: "Gran Cursos (Jurídico)" }
];

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Serviço de Coleta de Editais Iniciado para " + TARGETS.length + " fontes.");

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
        const geminiKey = Deno.env.get('GEMINI_API_KEY');

        if (!supabaseUrl || !supabaseServiceRoleKey || !firecrawlKey || !geminiKey) {
            throw new Error("Missing environment credentials");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        let totalInserted = 0;
        const errors: string[] = [];

        // Helper function to process a single source
        const processSource = async (source: Target) => {
            console.log(`[${source.name}] Buscando dados em: ${source.url}`);

            try {
                // 1. Scrape with Firecrawl
                const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${firecrawlKey}`,
                    },
                    body: JSON.stringify({
                        url: source.url,
                        formats: ['markdown'],
                        waitFor: 1000 // give SPA time to load if necessary
                    })
                });

                if (!firecrawlResponse.ok) {
                    throw new Error(`Firecrawl falhou: HTTP ${firecrawlResponse.status}`);
                }

                const firecrawlData = await firecrawlResponse.json();
                const rawMarkdown = firecrawlData.data?.markdown || '';

                if (!rawMarkdown || rawMarkdown.length < 100) {
                    console.log(`[${source.name}] Conteúdo insuficiente ou vazio.`);
                    return;
                }

                // 2. Parse with Gemini
                console.log(`[${source.name}] Resumindo com Gemini...`);
                const prompt = `
                Analise o texto markdown raspado do site ${source.name}.
                Extraia as 3 principais notícias de editais, bancas ou concursos mais recentes e relevantes.
                Para cada um, crie um JSON estruturado com:
                - title (string): Título chamativo e fiel
                - summary (string): Resumo de no máximo 3 linhas
                - source_url (string): Tente deduzir o link exato da notícia ou retorne "${source.url}" se não tiver um.
                - tags (array de strings): Ex: ["Tribunais", "Jurídico", "Edital Publicado"]
                
                Regras obrigatórias:
                - Retorne APENAS um array JSON puro, começando com [ e terminando com ].
                - Não use marcadores markdown como \`\`\`json.
                - Foque apenas em fatos, não crie notícias falsas.

                TEXTO RAW:
                ${rawMarkdown.substring(0, 15000)}
                `;

                const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1 }
                    })
                });

                const geminiData = await geminiResponse.json();

                if (geminiData.error) {
                    throw new Error(`Gemini falhou: ${geminiData.error.message}`);
                }

                const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!rawText) throw new Error("Gemini retornou resposta vazia");

                const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                let extractedNews: NewsItem[] = [];
                try {
                    extractedNews = JSON.parse(cleanedText);
                } catch (pe) {
                    console.error(`[${source.name}] Erro ao parsear JSON:`, cleanedText);
                    throw new Error(`Erro de parsing no JSON gerado: ${pe instanceof Error ? pe.message : 'desconhecido'}`);
                }

                console.log(`[${source.name}] ${extractedNews.length} itens extraídos.`);

                // 3. Upsert into Supabase
                for (const newsItem of extractedNews) {
                    // Normalize tags 
                    const cleanTags = Array.isArray(newsItem.tags) ? newsItem.tags : [];

                    const { error: insertError } = await supabase
                        .from('news_feed')
                        .upsert({
                            title: newsItem.title,
                            summary: newsItem.summary,
                            source_name: source.name,
                            source_url: newsItem.source_url || `${source.url}#${Date.now()}`,
                            tags: cleanTags,
                            published_at: new Date().toISOString(),
                        }, { onConflict: 'source_url' });

                    if (insertError) {
                        console.error(`[${source.name}] Erro ao inserir ${newsItem.title}:`, insertError.message);
                    } else {
                        totalInserted++;
                    }
                }

            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                console.error(`[${source.name}] Erro geral:`, errMsg);
                errors.push(`[${source.name}] ${errMsg}`);
            }
        };

        // We run them in sequence or parallel depending on limits. 
        // We will run Promise.allSettled for parallel speed (Edge funcs can run out of time).
        await Promise.allSettled(TARGETS.map(source => processSource(source)));

        return new Response(JSON.stringify({
            success: true,
            inserted: totalInserted,
            errors_detected: errors,
            message: `Busca finalizada. ${totalInserted} itens extraídos/atualizados em ${TARGETS.length} fontes.`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("Critical error executing edge function:", errMsg);
        return new Response(JSON.stringify({ error: errMsg }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
