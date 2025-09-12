-- Delete the 4 existing projects for Processing team
DELETE FROM project_assignees WHERE project_id IN (
  '6338412a-772e-43d7-89e5-a1c674d55c33',
  'd0c7fd0b-e7e0-455d-88c6-b75e3dec487b', 
  'b56a3512-76fd-4189-89b3-ee0bdde074ec',
  'b595534f-4707-4403-9b4d-3004505fb0af'
);

DELETE FROM project_products WHERE project_id IN (
  '6338412a-772e-43d7-89e5-a1c674d55c33',
  'd0c7fd0b-e7e0-455d-88c6-b75e3dec487b',
  'b56a3512-76fd-4189-89b3-ee0bdde074ec', 
  'b595534f-4707-4403-9b4d-3004505fb0af'
);

DELETE FROM projects WHERE id IN (
  '6338412a-772e-43d7-89e5-a1c674d55c33',
  'd0c7fd0b-e7e0-455d-88c6-b75e3dec487b',
  'b56a3512-76fd-4189-89b3-ee0bdde074ec',
  'b595534f-4707-4403-9b4d-3004505fb0af'
);

-- Insert new projects from the roadmap image for Processing team (PEx product)
INSERT INTO projects (name, team_id, start_date, end_date, status, value_score, is_rd) VALUES
  ('Datacap Rollout', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-06-02', '2025-07-14', 'Logged', 1, false),
  ('YAML Reviewer, Microservice RM', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-06-02', '2025-06-30', 'Logged', 1, false),
  ('Open Banking Rollout/Pilots', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-06-02', '2025-07-28', 'Logged', 1, false),
  ('Mentoring', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-06-02', '2025-07-21', 'Logged', 1, false),
  ('PTO', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-07-07', '2025-07-28', 'Logged', 1, false),
  ('UPC Long-Term Owner', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-07-07', '2025-09-22', 'Logged', 1, false),
  ('DV Session IDs', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-08-18', '2025-09-01', 'Logged', 1, false),
  ('Legacy EMAF deprecation', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-08-25', '2025-10-27', 'Logged', 1, false),
  ('WP processing fees', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-09-15', '2025-10-27', 'Logged', 1, false),
  ('Payback', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-07-07', '2025-09-29', 'Logged', 1, false),
  ('PINless Debit', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-06-02', '2025-10-27', 'Logged', 1, false),
  ('Minion replacement', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-08-04', '2025-10-27', 'Logged', 1, false),
  ('Bootcamp', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-06-02', '2025-06-16', 'Logged', 1, false),
  ('CLP improvements', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-07-14', '2025-08-11', 'Logged', 1, false),
  ('Response Time Monitoring', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-09-08', '2025-10-06', 'Logged', 1, false),
  ('Migrate EMAF-only and triPOS to new backfilling code', 'fbd5c124-a31d-446d-889c-e12e71567448', '2025-10-06', '2025-10-27', 'Logged', 1, false);

-- Link all new projects to PEx product
INSERT INTO project_products (project_id, product_id)
SELECT p.id, '0fa3b89a-5386-4241-b895-4e3dabef5156'
FROM projects p 
WHERE p.team_id = 'fbd5c124-a31d-446d-889c-e12e71567448' 
AND p.created_at >= now() - INTERVAL '1 minute';