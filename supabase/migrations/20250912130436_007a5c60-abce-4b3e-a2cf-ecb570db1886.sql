-- Fix Jordan Smith's over-allocation by adjusting project allocations

-- Reduce UPC Long-Term Owner from 75% to 50% to fix overlap with Open Banking Rollout
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '94daee7c-557e-40a6-b617-dc24fa19d142' 
  AND project_id = (SELECT id FROM projects WHERE name = 'UPC Long-Term Owner');

-- Reduce Response Time Monitoring from 100% to 50% to fix overlap with UPC Long-Term Owner  
UPDATE project_assignees 
SET percent_allocation = 50
WHERE team_member_id = '94daee7c-557e-40a6-b617-dc24fa19d142'
  AND project_id = (SELECT id FROM projects WHERE name = 'Response Time Monitoring');