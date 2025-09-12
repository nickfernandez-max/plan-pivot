-- Update project statuses based on their dates
UPDATE projects 
SET status = CASE
  WHEN start_date > CURRENT_DATE THEN 'Logged'::project_status
  WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'In Progress'::project_status  
  WHEN end_date < CURRENT_DATE THEN 'Complete'::project_status
  ELSE 'Logged'::project_status
END
WHERE team_id = 'fbd5c124-a31d-446d-889c-e12e71567448' 
AND created_at >= now() - INTERVAL '5 minutes';