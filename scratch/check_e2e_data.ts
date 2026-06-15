
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.E2E_EMAIL;

async function checkData() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Faltam variáveis de ambiente no .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Verificando dados para o usuário: ${email}`);

    // 1. Faz login para pegar o ID e o token
    const password = process.env.E2E_PASSWORD;
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: email!,
        password: password!,
    });

    if (authError || !session) {
        console.error('Erro ao fazer login:', authError?.message || 'Sessão não iniciada');
        return;
    }

    const user = session.user;
    console.log(`Logado com sucesso! User ID: ${user.id}`);

    // 2. Verifica matérias (editais)
    const { data: editais, error: editalError } = await supabase
        .from('editais_materias')
        .select('*')
        .eq('user_id', user.id);

    if (editalError) {
        console.error('Erro ao buscar editais:', editalError);
    } else {
        console.log(`Total de matérias encontradas: ${editais.length}`);
        editais.forEach(e => {
            console.log(`- Missão: ${e.concurso} | Matéria: ${e.materia}`);
        });
    }

    // 3. Verifica Missão Ativa no perfil/config (se houver essa tabela)
    // No MonitorPRO, a missão parece ser salva no localStorage ou em uma tabela de profiles.
    // Vamos checar se existe tabela 'profiles' ou similar.
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);
    
    if (profiles) {
        console.log('Profile found:', profiles[0]);
    }
}

checkData();
