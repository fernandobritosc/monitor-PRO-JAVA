-- TABELA DE MATERIAIS DE ESTUDO
CREATE TABLE IF NOT EXISTS public.study_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    materia text NOT NULL,
    assunto text,
    storage_path text NOT NULL, -- Caminho no bucket
    file_size bigint,
    mime_type text DEFAULT 'application/pdf',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
DROP POLICY IF EXISTS "Users can manage their own materials" ON public.study_materials;
CREATE POLICY "Users can manage their own materials" ON public.study_materials
    FOR ALL USING (auth.uid() = user_id);

-- INSTRUÇÕES PARA O STORAGE (Executar no SQL Editor para criar políticas do Bucket se ele for criado via UI)
-- 1. Crie o bucket "study-materials" na interface do Supabase.
-- 2. Execute as políticas abaixo para o bucket:

/*
-- Política para Inserção (Upload)
CREATE POLICY "Users can upload study materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Política para Leitura (Select)
CREATE POLICY "Users can view their own study materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'study-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Política para Exclusão
CREATE POLICY "Users can delete their own study materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND (storage.foldername(name))[1] = auth.uid()::text);
*/
