-- Add missing team memberships for Annual Events team members
-- First, get the team and member IDs
INSERT INTO team_memberships (team_member_id, team_id, start_month)
SELECT tm.id, tm.team_id, DATE_TRUNC('month', CURRENT_DATE)::date
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE t.name = 'Annual Events' 
  AND tm.name IN ('Zach S.', 'Wil W.')
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tmem 
    WHERE tmem.team_member_id = tm.id 
    AND tmem.team_id = tm.team_id
  );