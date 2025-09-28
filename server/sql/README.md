Run these SQL files in the Supabase web dashboard (SQL Editor) in order.

Important: Your client env file currently uses keys `VITE.SUPABASE_URL` and `VITE.SUPABASE_KEY` with dots. Vite expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (underscores) to match the code inside `client/src/lib/supabaseClient.js`.

Fix steps:
1. Rename in root `.env`:
   VITE_SUPABASE_URL="https://<your-project>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<anon-public-key>"
2. Remove the old dotted versions.
3. Restart `npm run dev` in the client.
4. Ensure `supabaseClient.js` finds both values (no console warnings).

After that, run `001_create_parlay_tables.sql` in Supabase. Then seed `active_parlays` (you can adapt from your JSON). History table intentionally starts empty.
