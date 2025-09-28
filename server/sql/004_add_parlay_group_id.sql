ALTER TABLE public.history_parlays
  ADD COLUMN IF NOT EXISTS parlay_group_id text;

UPDATE public.history_parlays
SET parlay_group_id = COALESCE(parlay_group_id, to_char(created_at, 'YYYYMMDDHH24MISS') || '-' || substr(id::text,1,8))
WHERE parlay_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_history_parlays_group ON public.history_parlays(parlay_group_id);
