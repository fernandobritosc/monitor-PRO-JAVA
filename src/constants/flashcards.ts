export const SQL_FLASHCARDS_POLICY = `
-- 1. TABELA DE FLASHCARDS
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  concurso text DEFAULT 'Geral',
  materia text NOT NULL,
  assunto text,
  front text NOT NULL,
  back text NOT NULL,
  ai_generated_assets jsonb,
  original_audio_id text,
  author_name text,
  status text DEFAULT 'novo',
  next_review timestamp with time zone,
  interval numeric,
  ease_factor numeric,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE flashcards DROP COLUMN IF EXISTS ai_explanation;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS concurso text DEFAULT 'Geral';
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS ai_generated_assets jsonb;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS original_audio_id text;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS author_name text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-revisions', 'audio-revisions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Audio" ON storage.objects;
CREATE POLICY "Public Access Audio" ON storage.objects FOR SELECT USING ( bucket_id = 'audio-revisions' );

DROP POLICY IF EXISTS "Authenticated Upload Audio" ON storage.objects;
CREATE POLICY "Authenticated Upload Audio" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'audio-revisions' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Delete Audio" ON storage.objects;
CREATE POLICY "Authenticated Delete Audio" ON storage.objects FOR DELETE USING ( bucket_id = 'audio-revisions' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Update Audio" ON storage.objects;
CREATE POLICY "Authenticated Update Audio" ON storage.objects FOR UPDATE USING ( bucket_id = 'audio-revisions' AND auth.role() = 'authenticated' );

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Leitura Publica Flashcards" ON flashcards;
CREATE POLICY "Permitir Leitura Publica Flashcards" ON flashcards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir Criacao Propria Flashcards" ON flashcards;
CREATE POLICY "Permitir Criacao Propria Flashcards" ON flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Edicao Propria Flashcards" ON flashcards;
CREATE POLICY "Permitir Edicao Propria Flashcards" ON flashcards FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Exclusao Propria Flashcards" ON flashcards;
CREATE POLICY "Permitir Exclusao Propria Flashcards" ON flashcards FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE IF EXISTS flashcards DROP CONSTRAINT IF EXISTS flashcards_user_materia_front_key;
DROP INDEX IF EXISTS flashcards_user_materia_front_key;

DELETE FROM flashcards WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, concurso, materia, front ORDER BY created_at DESC) as row_num FROM flashcards) t WHERE t.row_num > 1);
DROP INDEX IF EXISTS flashcards_user_concurso_materia_front_key;
CREATE UNIQUE INDEX flashcards_user_concurso_materia_front_key ON flashcards (user_id, concurso, materia, front);

UPDATE flashcards f
SET author_name = (
    SELECT split_part(email, '@', 1)
    FROM auth.users u
    WHERE u.id = f.user_id
)
WHERE author_name IS NULL;
`;
