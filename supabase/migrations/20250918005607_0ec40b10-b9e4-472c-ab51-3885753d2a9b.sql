-- Add missing team membership for Walker M. only
INSERT INTO team_memberships (team_member_id, team_id, start_month)
SELECT tm.id, tm.team_id, DATE_TRUNC('month', tm.created_at)::date
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.name = 'Walker M.'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tmem 
    WHERE tmem.team_member_id = tm.id 
    AND tmem.team_id = tm.team_id
  );