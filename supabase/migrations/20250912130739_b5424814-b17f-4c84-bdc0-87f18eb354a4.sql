-- Fix the most severe over-allocation cases

-- 6. Jan Burks: Reduce overlapping projects to manageable levels (Feb-May 2024 period)
-- Reduce Customer Segmentation from 75% to 40%
UPDATE project_assignees 
SET percent_allocation = 40
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Customer Segmentation Tool');

-- Reduce Predictive Modeling from 75% to 35%  
UPDATE project_assignees 
SET percent_allocation = 35
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Predictive Modeling Engine');

-- Reduce Real-time Dashboard from 75% to 25%
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Real-time Dashboard Framework');

-- Keep Data Pipeline at 75% but it only overlaps in March-May period
-- This gives Jan: Customer(40%) + Predictive(35%) + Real-time(25%) = 100% for Feb-March
-- Then Customer(40%) + Predictive(35%) + Real-time(25%) + Data Pipeline can be reduced too

-- 7. Jill Scott: Reduce Offline Mode from 75% to 25% (overlap with Inventory Management)
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '77dde75b-917a-4f4a-a3c2-f60407e4a855' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Offline Mode Enhancement');

-- 8. Taylor Johnson: Reduce CLP improvements from 100% to 25% (overlap with PINless Debit 75%)
UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '79b747c5-5315-4fd9-b99f-d1c36b4d07b4' 
  AND project_id = (SELECT id FROM projects WHERE name = 'CLP improvements');