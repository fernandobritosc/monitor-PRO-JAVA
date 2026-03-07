-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE PARA CORRIGIR O UPLOAD

-- 1. Garante que o bucket existe (Manual via UI é recomendado, mas este comando ajuda)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('study-materials', 'study-materials', false)
-- ON CONFLICT (id) DO NOTHING;

-- 2. Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can upload study materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own study materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own study materials" ON storage.objects;

-- 3. PERMISSÃO DE UPLOAD (INSERT)
-- Permite que usuários autenticados subam arquivos para 'study-materials' desde que o caminho comece com o seu ID
CREATE POLICY "Users can upload study materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'study-materials' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. PERMISSÃO DE LEITURA (SELECT)
CREATE POLICY "Users can view their own study materials"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'study-materials' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. PERMISSÃO DE EXCLUSÃO (DELETE)
CREATE POLICY "Users can delete their own study materials"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'study-materials' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
