-- Fix the incorrect ideal size migration for aProcessing team
UPDATE team_ideal_sizes 
SET ideal_size = 6
WHERE team_id = (SELECT id FROM teams WHERE name = 'aProcessing')
  AND start_month = '2025-07-01';