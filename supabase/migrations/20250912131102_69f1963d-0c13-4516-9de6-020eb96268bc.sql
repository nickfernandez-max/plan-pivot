-- Fix the most severe remaining cases (200%+ allocations)

-- 9. Nick Fernandez: Multiple severe overlaps - need significant reductions
-- Reduce Mentoring from 75% to 25% (July 7-21 overlap with Payback)
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Mentoring');

-- Reduce Payback from 75% to 40% (overlaps with multiple projects)
UPDATE project_assignees 
SET percent_allocation = 40
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Payback');

-- Reduce Minion replacement from 75% to 30% (overlaps August-October)
UPDATE project_assignees 
SET percent_allocation = 30
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Minion replacement');

-- Reduce WP processing fees from 75% to 30% (September-October overlap)
UPDATE project_assignees 
SET percent_allocation = 30
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'WP processing fees');

-- 10. Sarah Chen: Fix 200% allocations by reducing overlapping projects
-- Reduce PTO from 100% to 50% (overlap with Open Banking)
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '656431ae-9099-439b-811b-4bf950d132ca' 
  AND project_id = (SELECT id FROM projects WHERE name = 'PTO');

-- Reduce Open Banking from 100% to 50% (overlap with PTO)
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '656431ae-9099-439b-811b-4bf950d132ca' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Open Banking Rollout/Pilots');

-- Reduce DV Session IDs from 100% to 50% (no longer overlaps with reduced Open Banking)
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '656431ae-9099-439b-811b-4bf950d132ca' 
  AND project_id = (SELECT id FROM projects WHERE name = 'DV Session IDs');