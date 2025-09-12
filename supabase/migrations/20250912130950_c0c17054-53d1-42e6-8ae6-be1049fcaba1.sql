-- Fix the most critical remaining over-allocation cases

-- 9. Nick Fernandez: Has severe over-allocations (up to 275%)
-- Reduce Mentoring from 75% to 25%
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Mentoring');

-- Reduce Payback from 75% to 25%  
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Payback');

-- Reduce Minion replacement from 75% to 25%
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Minion replacement');

-- Reduce WP processing fees from 75% to 25%
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'WP processing fees');

-- 10. Sarah Chen: Has 200% allocations in multiple periods
-- Reduce PTO from 100% to 50% (overlap with Open Banking 100%)
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '656431ae-9099-439b-811b-4bf950d132ca' 
  AND project_id = (SELECT id FROM projects WHERE name = 'PTO');

-- Reduce DV Session IDs from 100% to 50% (overlap with Open Banking)  
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '656431ae-9099-439b-811b-4bf950d132ca' 
  AND project_id = (SELECT id FROM projects WHERE name = 'DV Session IDs');