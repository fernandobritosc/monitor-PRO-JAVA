-- ADICIONAR CAMPOS DE PODCAST AOS MATERIAIS DE ESTUDO
ALTER TABLE public.study_materials 
ADD COLUMN IF NOT EXISTS podcast_path text,
ADD COLUMN IF NOT EXISTS podcast_file_size bigint;

-- Comentários para documentação
COMMENT ON COLUMN public.study_materials.podcast_path IS 'Caminho do arquivo de áudio (podcast) no storage';
COMMENT ON COLUMN public.study_materials.podcast_file_size IS 'Tamanho do arquivo de áudio do podcast';
