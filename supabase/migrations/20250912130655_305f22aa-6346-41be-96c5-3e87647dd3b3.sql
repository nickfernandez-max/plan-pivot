-- Fix over-allocation issues systematically

-- 1. Alex Kim: Reduce Bootcamp from 75% to 25% (June 2-16 overlap with YAML Reviewer 100%)
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = 'd139550c-fd31-4227-92d0-426510372ba9' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Bootcamp' AND team_id = (SELECT team_id FROM team_members WHERE id = 'd139550c-fd31-4227-92d0-426510372ba9'));

-- 2. Alice Johnson: Reduce AI Tax Assistant from 75% to 25% (overlap with Mobile Tax Calculator)  
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = 'f243e222-ba03-452b-9e42-02bab630aed0' 
  AND project_id = (SELECT id FROM projects WHERE name = 'AI Tax Assistant');

-- 3. Alice Johnson: Reduce Security Audit from 75% to 25% (overlap with API Gateway)
UPDATE project_assignees 
SET percent_allocation = 25  
WHERE team_member_id = 'f243e222-ba03-452b-9e42-02bab630aed0'
  AND project_id = (SELECT id FROM projects WHERE name = 'Security Audit Implementation');

-- 4. Casey Brown: Reduce Payback from 25% to 15% (overlap with Datacap Rollout 100%)
UPDATE project_assignees 
SET percent_allocation = 15
WHERE team_member_id = 'bed8b703-6f75-4567-bb68-eeb4272057f9' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Payback');

-- 5. Eve Davis: Reduce Client Onboarding from 75% to 25% (overlap with Reporting Engine)
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '077d43e9-3d84-410b-aec0-7fc581ba1834' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Client Onboarding Automation');