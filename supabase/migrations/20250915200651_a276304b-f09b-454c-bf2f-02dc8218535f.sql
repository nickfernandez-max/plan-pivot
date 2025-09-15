INSERT INTO team_memberships (team_member_id, team_id, start_month)
SELECT 
  tm.id as team_member_id,
  tm.team_id,
  CASE 
    WHEN tm.start_date > CURRENT_DATE THEN date_trunc('month', tm.start_date)::date
    ELSE date_trunc('month', CURRENT_DATE)::date
  END as start_month
FROM team_members tm
LEFT JOIN team_memberships tms ON tm.id = tms.team_member_id
WHERE tms.id IS NULL;