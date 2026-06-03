ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS ease text,
  ADD COLUMN IF NOT EXISTS quadrant_score integer,
  ADD COLUMN IF NOT EXISTS display_order integer;