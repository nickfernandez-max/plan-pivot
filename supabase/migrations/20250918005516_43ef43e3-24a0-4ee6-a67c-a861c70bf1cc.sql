-- Add missing team memberships for all orphaned team members
INSERT INTO team_memberships (team_member_id, team_id, start_month)
SELECT tm.id, tm.team_id, DATE_TRUNC('month', tm.created_at)::date
FROM team_members tm
LEFT JOIN team_memberships tmem ON tmem.team_member_id = tm.id AND tmem.team_id = tm.team_id
WHERE tmem.id IS NULL;