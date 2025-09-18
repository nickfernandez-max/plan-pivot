-- Fix Maya R's corrupted team membership data
-- She currently has start_month = end_month = '2025-09-01' which creates a zero-duration assignment

UPDATE team_memberships 
SET end_month = NULL, 
    updated_at = now()
FROM team_members tm
WHERE team_memberships.team_member_id = tm.id 
  AND tm.name = 'Maya R'
  AND team_memberships.start_month = '2025-09-01'
  AND team_memberships.end_month = '2025-09-01';