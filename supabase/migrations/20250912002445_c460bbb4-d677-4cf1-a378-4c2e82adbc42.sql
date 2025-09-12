-- Add 7 new team members to Processing team
-- 3 BAs and 4 Devs
INSERT INTO team_members (name, role_id, team_id, start_date) VALUES
-- 3 Business Analysts
('Sarah Chen', (SELECT id FROM roles WHERE name = 'BA' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01'),
('Mike Rodriguez', (SELECT id FROM roles WHERE name = 'BA' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01'),
('Emily Watson', (SELECT id FROM roles WHERE name = 'BA' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01'),
-- 4 Developers (using different dev roles)
('Alex Kim', (SELECT id FROM roles WHERE name = 'Dev 1' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01'),
('Jordan Smith', (SELECT id FROM roles WHERE name = 'Dev 2' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01'),
('Taylor Johnson', (SELECT id FROM roles WHERE name = 'Dev 3' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01'),
('Casey Brown', (SELECT id FROM roles WHERE name = 'Dev 4' LIMIT 1), 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-12-01');

-- Create team memberships for the new members starting from December 2024
INSERT INTO team_memberships (team_member_id, team_id, start_month) 
SELECT tm.id, tm.team_id, '2024-12-01'::date
FROM team_members tm 
WHERE tm.team_id = 'fbd5c124-a31d-446d-889c-e12e71567448' 
AND tm.name IN ('Sarah Chen', 'Mike Rodriguez', 'Emily Watson', 'Alex Kim', 'Jordan Smith', 'Taylor Johnson', 'Casey Brown');

-- Assign team members to Processing projects (16 projects total)
-- Each project gets 1 BA and 1 Dev with random allocations (25%, 50%, 75%, 100%)
WITH processing_projects AS (
  SELECT id, start_date, end_date, name,
         ROW_NUMBER() OVER (ORDER BY start_date, name) as project_num
  FROM projects 
  WHERE team_id = 'fbd5c124-a31d-446d-889c-e12e71567448'
),
bas AS (
  SELECT tm.id, tm.name, ROW_NUMBER() OVER (ORDER BY tm.name) as ba_num
  FROM team_members tm
  JOIN roles r ON tm.role_id = r.id
  WHERE tm.team_id = 'fbd5c124-a31d-446d-889c-e12e71567448' 
  AND r.name = 'BA'
),
devs AS (
  SELECT tm.id, tm.name, ROW_NUMBER() OVER (ORDER BY tm.name) as dev_num  
  FROM team_members tm
  JOIN roles r ON tm.role_id = r.id
  WHERE tm.team_id = 'fbd5c124-a31d-446d-889c-e12e71567448' 
  AND r.name LIKE 'Dev%'
),
random_allocations AS (
  SELECT 
    project_num,
    CASE (project_num - 1) % 4 
      WHEN 0 THEN 25
      WHEN 1 THEN 50  
      WHEN 2 THEN 75
      ELSE 100
    END as ba_allocation,
    CASE (project_num - 1 + 2) % 4
      WHEN 0 THEN 25
      WHEN 1 THEN 50
      WHEN 2 THEN 75  
      ELSE 100
    END as dev_allocation
  FROM processing_projects
)
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
-- Assign BAs to projects
SELECT 
  pp.id as project_id,
  bas.id as team_member_id,
  ra.ba_allocation as percent_allocation,
  pp.start_date,
  pp.end_date
FROM processing_projects pp
JOIN random_allocations ra ON pp.project_num = ra.project_num
CROSS JOIN bas
WHERE bas.ba_num = ((pp.project_num - 1) % (SELECT COUNT(*) FROM bas)) + 1

UNION ALL

-- Assign Devs to projects  
SELECT 
  pp.id as project_id,
  devs.id as team_member_id,
  ra.dev_allocation as percent_allocation,
  pp.start_date,
  pp.end_date
FROM processing_projects pp
JOIN random_allocations ra ON pp.project_num = ra.project_num
CROSS JOIN devs
WHERE devs.dev_num = ((pp.project_num - 1) % (SELECT COUNT(*) FROM devs)) + 1;