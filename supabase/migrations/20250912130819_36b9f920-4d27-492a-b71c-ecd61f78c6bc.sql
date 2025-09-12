-- Continue fixing critical over-allocation cases

-- 6. Jan Burks: Reduce multiple overlapping 75% assignments to manageable levels
-- Keep Customer Segmentation at 75%, reduce others
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Predictive Modeling Engine');

UPDATE project_assignees 
SET percent_allocation = 25  
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388'
  AND project_id = (SELECT id FROM projects WHERE name = 'Real-time Dashboard Framework');

UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Data Pipeline Modernization');

-- 7. Jill Scott: Reduce Offline Mode from 75% to 25% (overlap with Inventory Management)
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '77dde75b-917a-4f4a-a3c2-f60407e4a855' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Offline Mode Enhancement');

-- 8. Nick Fernandez: Reduce multiple overlapping assignments  
-- Reduce Payback from 75% to 25%
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Payback');

-- Reduce Minion replacement from 75% to 50%
UPDATE project_assignees 
SET percent_allocation = 50  
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7'
  AND project_id = (SELECT id FROM projects WHERE name = 'Minion replacement');

-- Reduce WP processing fees from 75% to 25%
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '05f4da5f-1f93-469f-8787-9f45060582e7' 
  AND project_id = (SELECT id FROM projects WHERE name = 'WP processing fees');