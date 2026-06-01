-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- user_profile
-- =========================================================
CREATE TABLE public.user_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  adhd_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
  anchor_time TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  focus_mode_preference TEXT NOT NULL DEFAULT 'light',
  coach_tone TEXT NOT NULL DEFAULT 'gentle',
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profile TO authenticated;
GRANT ALL ON public.user_profile TO service_role;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.user_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.user_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.user_profile FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own profile delete" ON public.user_profile FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_profile_updated BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- tasks
-- =========================================================
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  time_estimate_mins INTEGER NOT NULL DEFAULT 15,
  energy_level TEXT NOT NULL DEFAULT 'medium',
  micro_first_step TEXT,
  tab TEXT NOT NULL DEFAULT 'today',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks select" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks update" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own tasks delete" ON public.tasks FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_tasks_user ON public.tasks(user_id);

-- =========================================================
-- focus_sessions
-- =========================================================
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_name TEXT,
  planned_duration INTEGER NOT NULL DEFAULT 25,
  actual_duration INTEGER,
  outcome_rating TEXT,
  energy_before TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
GRANT ALL ON public.focus_sessions TO service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fs select" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own fs insert" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own fs update" ON public.focus_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own fs delete" ON public.focus_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_fs_user ON public.focus_sessions(user_id);

-- =========================================================
-- habits
-- =========================================================
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_name TEXT NOT NULL DEFAULT 'Morning Routine',
  name TEXT NOT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 5,
  mvp_fallback TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits select" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own habits insert" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own habits update" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own habits delete" ON public.habits FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_habits_user ON public.habits(user_id);

-- =========================================================
-- habit_logs
-- =========================================================
CREATE TABLE public.habit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  is_bad_day_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hl select" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own hl insert" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own hl update" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own hl delete" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_hl_user ON public.habit_logs(user_id);

-- =========================================================
-- daily_logs
-- =========================================================
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours TEXT,
  focus_score INTEGER,
  mood_score INTEGER,
  medication_taken TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dl select" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own dl insert" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dl update" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own dl delete" ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_dl_user ON public.daily_logs(user_id);

-- =========================================================
-- coach_messages
-- =========================================================
CREATE TABLE public.coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cm select" ON public.coach_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own cm insert" ON public.coach_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cm delete" ON public.coach_messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_cm_user ON public.coach_messages(user_id);

-- =========================================================
-- coach_feedback
-- =========================================================
CREATE TABLE public.coach_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL,
  rating TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_feedback TO authenticated;
GRANT ALL ON public.coach_feedback TO service_role;
ALTER TABLE public.coach_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cf select" ON public.coach_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own cf insert" ON public.coach_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_cf_user ON public.coach_feedback(user_id);