-- Simple approach: Delete duplicate projects and their associations
-- Keep the earliest created project for each name

-- First, identify and delete duplicate project_products entries
DELETE FROM project_products 
WHERE project_id IN (
  SELECT p.id 
  FROM projects p
  WHERE p.id NOT IN (
    SELECT DISTINCT ON (name) id 
    FROM projects 
    ORDER BY name, created_at ASC
  )
);

-- Delete duplicate project_assignees entries  
DELETE FROM project_assignees 
WHERE project_id IN (
  SELECT p.id 
  FROM projects p
  WHERE p.id NOT IN (
    SELECT DISTINCT ON (name) id 
    FROM projects 
    ORDER BY name, created_at ASC
  )
);

-- Now delete the duplicate projects
DELETE FROM projects 
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id 
  FROM projects 
  ORDER BY name, created_at ASC
);

-- Now add some multi-user assignments to remaining projects
-- Add Bob Smith to Admin Portal Redesign (if exists)
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  p.id,
  tm.id,
  50,
  '2024-01-08'::date,
  '2024-05-30'::date
FROM projects p 
CROSS JOIN team_members tm
WHERE p.name = 'Admin Portal Redesign' 
  AND tm.name = 'Bob Smith'
  AND NOT EXISTS (
    SELECT 1 FROM project_assignees pa 
    WHERE pa.project_id = p.id AND pa.team_member_id = tm.id
  )
LIMIT 1;