-- Final fix for Jan Burks: Reduce Data Pipeline to prevent March-May overlap
-- Jan now has Customer(40%) + Predictive(35%) + Real-time(25%) = 100% for Feb-March
-- For March-May period, need to reduce Data Pipeline from 75% to fit with the others

UPDATE project_assignees 
SET percent_allocation = 25
WHERE team_member_id = '5e3934c7-36bc-444e-a8eb-5bbe8388e388' 
  AND project_id = (SELECT id FROM projects WHERE name = 'Data Pipeline Modernization');

-- This gives Jan Burks in March-May: Customer(40%) + Predictive(35%) + Data Pipeline(25%) = 100%
-- And Real-time Dashboard ends in June, so no further overlap