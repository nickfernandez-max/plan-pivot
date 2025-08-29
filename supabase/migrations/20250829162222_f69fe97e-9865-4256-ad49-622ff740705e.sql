-- Fix duplicate projects by keeping the first created one for each name
-- and reassigning all assignments to that project

-- For each duplicate project name group, delete all but the earliest created one
WITH duplicates AS (
  SELECT id, name, created_at,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM projects
),
projects_to_delete AS (
  SELECT id, name FROM duplicates WHERE rn > 1
),
reassign_assignments AS (
  -- Update project_assignees to point to the kept project (earliest created)
  UPDATE project_assignees 
  SET project_id = (
    SELECT d.id 
    FROM duplicates d 
    WHERE d.name = (
      SELECT p.name 
      FROM projects p 
      WHERE p.id = project_assignees.project_id
    )
    AND d.rn = 1
  )
  WHERE project_id IN (SELECT id FROM projects_to_delete)
  RETURNING project_assignees.id
),
reassign_products AS (
  -- Update project_products to point to the kept project
  UPDATE project_products
  SET project_id = (
    SELECT d.id 
    FROM duplicates d 
    WHERE d.name = (
      SELECT p.name 
      FROM projects p 
      WHERE p.id = project_products.project_id
    )
    AND d.rn = 1
  )
  WHERE project_id IN (SELECT id FROM projects_to_delete)
  RETURNING project_products.id
)
-- Delete the duplicate projects
DELETE FROM projects WHERE id IN (SELECT id FROM projects_to_delete);

-- Now add some multi-user assignments to create projects with multiple assignees
-- Add Bob Smith to Admin Portal Redesign
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  p.id,
  tm.id,
  50,
  '2024-01-08'::date,
  '2024-05-30'::date
FROM projects p, team_members tm
WHERE p.name = 'Admin Portal Redesign' 
  AND tm.name = 'Bob Smith'
  AND NOT EXISTS (
    SELECT 1 FROM project_assignees pa 
    WHERE pa.project_id = p.id AND pa.team_member_id = tm.id
  )
LIMIT 1;

-- Add Carol Williams to API Gateway Redesign  
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  p.id,
  tm.id,
  40,
  '2024-02-01'::date,
  '2024-06-15'::date
FROM projects p, team_members tm
WHERE p.name = 'API Gateway Redesign' 
  AND tm.name = 'Carol Williams'
  AND NOT EXISTS (
    SELECT 1 FROM project_assignees pa 
    WHERE pa.project_id = p.id AND pa.team_member_id = tm.id
  )
LIMIT 1;