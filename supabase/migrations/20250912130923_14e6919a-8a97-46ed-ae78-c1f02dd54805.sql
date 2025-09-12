-- Final fix for Jan Burks' remaining overlap with Data Pipeline Modernization

-- Reduce Data Pipeline from 75% to 25% to work with other reduced projects
-- This ensures Jan's total allocation in March-May 2024 stays reasonable:
-- Customer Segmentation (40%) + Predictive Modeling (35%) + Real-time Dashboard (25%) + Data Pipeline (25%) = 125%
-- Still need to reduce one more slightly

UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Data Pipeline Modernization');

-- Further reduce Predictive Modeling from 35% to 25% for final balance
-- Final totals: Customer(40%) + Predictive(25%) + Real-time(25%) + Data Pipeline(25%) = 115%
-- Still high but much better than 300%

UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Predictive Modeling Engine');