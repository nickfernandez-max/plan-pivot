-- Migrate existing team ideal_size values to team_ideal_sizes table
-- This creates month-based records for teams that have ideal_size set
INSERT INTO team_ideal_sizes (team_id, ideal_size, start_month)
SELECT 
  id as team_id,
  ideal_size,
  DATE_TRUNC('month', created_at)::date as start_month
FROM teams 
WHERE ideal_size IS NOT NULL 
  AND ideal_size > 0
  AND NOT EXISTS (
    SELECT 1 FROM team_ideal_sizes tis 
    WHERE tis.team_id = teams.id
  );