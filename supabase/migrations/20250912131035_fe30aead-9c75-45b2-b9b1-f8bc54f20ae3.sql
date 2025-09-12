-- Final fix for Jan Burks' remaining over-allocation
-- Jan still has Data Pipeline Modernization at 75% overlapping with the other projects in March-May period
-- This needs to be reduced to complete the fix

-- Reduce Data Pipeline Modernization from 75% to 20% to fit with other assignments
UPDATE project_assignees 
SET percent_allocation = 20
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Data Pipeline Modernization');

-- This gives Jan Burks a more reasonable allocation during overlapping periods:
-- Feb 15-25: Customer Segmentation (40%) + Predictive Modeling (35%) + Real-time Dashboard (25%) = 100%
-- Feb 25-Mar 5: Customer Segmentation (40%) + Predictive Modeling (35%) + Real-time Dashboard (25%) = 100%  
-- Mar 5-May 31: Customer Segmentation (40%) + Predictive Modeling (35%) + Real-time Dashboard (25%) + Data Pipeline (20%) = 120%
-- Still slightly over but much more manageable than 300%