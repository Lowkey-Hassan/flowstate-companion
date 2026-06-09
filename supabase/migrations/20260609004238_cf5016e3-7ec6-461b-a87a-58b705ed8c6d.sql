CREATE TABLE public.thought_chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  theme text,
  entry_count integer NOT NULL DEFAULT 0,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thought_chapters TO authenticated;
GRANT ALL ON public.thought_chapters TO service_role;

ALTER TABLE public.thought_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own thought_chapters select" ON public.thought_chapters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own thought_chapters insert" ON public.thought_chapters
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thought_chapters update" ON public.thought_chapters
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thought_chapters delete" ON public.thought_chapters
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.thought_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_thought text NOT NULL,
  crystallized text,
  hidden_question text,
  tones text[] NOT NULL DEFAULT '{}',
  breakdown text[] NOT NULL DEFAULT '{}',
  word_cloud_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_saved boolean NOT NULL DEFAULT false,
  chapter_id uuid REFERENCES public.thought_chapters(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thought_entries TO authenticated;
GRANT ALL ON public.thought_entries TO service_role;

ALTER TABLE public.thought_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own thought_entries select" ON public.thought_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own thought_entries insert" ON public.thought_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thought_entries update" ON public.thought_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thought_entries delete" ON public.thought_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_thought_entries_user_created ON public.thought_entries (user_id, created_at DESC);
CREATE INDEX idx_thought_chapters_user ON public.thought_chapters (user_id, chapter_number);

CREATE TRIGGER update_thought_entries_updated_at BEFORE UPDATE ON public.thought_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_thought_chapters_updated_at BEFORE UPDATE ON public.thought_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();