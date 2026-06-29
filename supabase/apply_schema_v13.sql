-- v13: Allow unauthenticated (anon) users to read locations list
-- Needed so the mobile registration screen can show the location picker
-- without requiring a session.

DROP POLICY IF EXISTS "locations_anon_select" ON locations;
CREATE POLICY "locations_anon_select"
  ON locations FOR SELECT
  TO anon
  USING (true);
