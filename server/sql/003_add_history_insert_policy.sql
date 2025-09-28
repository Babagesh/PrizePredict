-- Allow anonymous insert into history_parlays (adjust in production to user-based auth)
-- Run after 001_create_parlay_tables.sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='history_parlays' AND policyname='Allow all insert'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all insert" ON public.history_parlays FOR INSERT WITH CHECK (true)';
  END IF;
END $$;
