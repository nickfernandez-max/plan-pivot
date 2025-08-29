-- First, let's clean up duplicate projects and create proper multi-user assignments
-- We'll keep one instance of each project and reassign the assignments

-- Delete duplicate projects and reassign their assignments to the kept project
WITH project_groups AS (
  SELECT name, MIN(id) as keep_id, array_agg(id) as all_ids
  FROM projects 
  GROUP BY name 
  HAVING count(*) > 1
),
reassignments AS (
  UPDATE project_assignees 
  SET project_id = pg.keep_id
  FROM project_groups pg
  WHERE project_assignees.project_id = ANY(pg.all_ids) 
  AND project_assignees.project_id != pg.keep_id
  RETURNING project_assignees.id
)
DELETE FROM projects 
WHERE id IN (
  SELECT unnest(all_ids) 
  FROM project_groups 
  WHERE keep_id != ANY(all_ids)
);

-- Update some projects to have multiple assignees by adding additional assignments
-- Let's add a second person to "Admin Portal Redesign"
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  (SELECT id FROM projects WHERE name = 'Admin Portal Redesign' LIMIT 1),
  (SELECT id FROM team_members WHERE name = 'Bob Smith' LIMIT 1),
  50,
  '2024-01-08'::date,
  '2024-05-30'::date
WHERE EXISTS (SELECT 1 FROM projects WHERE name = 'Admin Portal Redesign')
  AND EXISTS (SELECT 1 FROM team_members WHERE name = 'Bob Smith');

-- Add a second person to "API Gateway Redesign"
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  (SELECT id FROM projects WHERE name = 'API Gateway Redesign' LIMIT 1),
  (SELECT id FROM team_members WHERE name = 'Carol Williams' LIMIT 1),
  40,
  '2024-02-01'::date,
  '2024-06-15'::date
WHERE EXISTS (SELECT 1 FROM projects WHERE name = 'API Gateway Redesign')
  AND EXISTS (SELECT 1 FROM team_members WHERE name = 'Carol Williams');

-- Add a second person to "Customer Analytics Dashboard"
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  (SELECT id FROM projects WHERE name = 'Customer Analytics Dashboard' LIMIT 1),
  (SELECT id FROM team_members WHERE name = 'Bob Smith' LIMIT 1),
  60,
  '2024-01-20'::date,
  '2024-05-15'::date
WHERE EXISTS (SELECT 1 FROM projects WHERE name = 'Customer Analytics Dashboard')
  AND EXISTS (SELECT 1 FROM team_members WHERE name = 'Bob Smith');