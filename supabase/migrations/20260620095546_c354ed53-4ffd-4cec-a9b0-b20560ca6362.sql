-- Rename identity-specific column to neutral name
ALTER TABLE public.user_profile RENAME COLUMN adhd_traits TO mind_traits;

-- Chess games history
CREATE TABLE public.chess_games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result text NOT NULL,
  end_condition text NOT NULL,
  difficulty_label text NOT NULL,
  base_skill_level int NOT NULL DEFAULT 8,
  min_skill_reached int NOT NULL DEFAULT 8,
  max_skill_reached int NOT NULL DEFAULT 8,
  time_control_minutes int NOT NULL DEFAULT 10,
  total_moves int NOT NULL DEFAULT 0,
  duration_seconds int NOT NULL DEFAULT 0,
  accuracy_percent double precision NOT NULL DEFAULT 0,
  blunders int NOT NULL DEFAULT 0,
  mistakes int NOT NULL DEFAULT 0,
  inaccuracies int NOT NULL DEFAULT 0,
  good_moves int NOT NULL DEFAULT 0,
  brilliant_moves int NOT NULL DEFAULT 0,
  pgn text,
  ai_report text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chess_games TO authenticated;
GRANT ALL ON public.chess_games TO service_role;

ALTER TABLE public.chess_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chess games"
  ON public.chess_games FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chess games"
  ON public.chess_games FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chess games"
  ON public.chess_games FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chess games"
  ON public.chess_games FOR DELETE TO authenticated
  USING (auth.uid() = user_id);