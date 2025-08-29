-- Clean up existing data and insert fresh fake projects
DELETE FROM project_assignees;
DELETE FROM project_products;
DELETE FROM projects WHERE name IN (
  'Mobile Tax Calculator', 'API Gateway Redesign', 'AI Tax Assistant', 'Security Audit Implementation',
  'Tax Form Builder', 'Customer Analytics Dashboard', 'Payment Processing Optimization', 
  'Fraud Detection System', 'Multi-Currency Support', 'Admin Portal Redesign',
  'Reporting Engine V2', 'Client Onboarding Automation', 'Mobile POS App',
  'Inventory Management Integration', 'Offline Mode Enhancement', 'Advanced Analytics Platform',
  'Predictive Modeling Engine', 'Data Pipeline Modernization', 'Customer Segmentation Tool',
  'Real-time Dashboard Framework'
);

-- Insert 20 fake projects with realistic data
INSERT INTO projects (name, team_id, start_date, end_date, value_score, is_rd, description, color) VALUES
-- Engineering team projects (TaxSys product)
('Mobile Tax Calculator', 'b0878bff-71b7-41cc-9d9e-d776103940f3', '2024-01-15', '2024-04-30', 9, false, 'Mobile app for tax calculations with offline capability', '#10B981'),
('API Gateway Redesign', 'b0878bff-71b7-41cc-9d9e-d776103940f3', '2024-02-01', '2024-06-15', 8, false, 'Modernize the API gateway infrastructure for better performance', '#3B82F6'),
('AI Tax Assistant', 'b0878bff-71b7-41cc-9d9e-d776103940f3', '2024-03-01', '2024-08-31', 10, true, 'AI-powered tax advice and guidance system', '#8B5CF6'),
('Security Audit Implementation', 'b0878bff-71b7-41cc-9d9e-d776103940f3', '2024-01-10', '2024-03-15', 7, false, 'Comprehensive security review and fixes', '#EF4444'),

-- Product team projects (TaxSys product)
('Tax Form Builder', '5a27eb80-4e1d-423a-89b6-7cbf6e92860a', '2024-02-15', '2024-07-30', 8, false, 'Drag-and-drop tax form creation tool', '#F59E0B'),
('Customer Analytics Dashboard', '5a27eb80-4e1d-423a-89b6-7cbf6e92860a', '2024-01-20', '2024-05-15', 6, false, 'Real-time customer behavior analytics', '#06B6D4'),

-- Processing team projects (PEx product)
('Payment Processing Optimization', 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-01-05', '2024-04-20', 9, false, 'Improve payment processing speed and reliability', '#10B981'),
('Fraud Detection System', 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-02-10', '2024-06-30', 10, true, 'Machine learning based fraud detection', '#EF4444'),
('Multi-Currency Support', 'fbd5c124-a31d-446d-889c-e12e71567448', '2024-03-15', '2024-08-15', 7, false, 'Add support for 50+ currencies', '#3B82F6'),

-- Client Back Office team projects (PEx product)
('Admin Portal Redesign', 'd13c1c5f-46ec-4634-a665-c9f343d91b5b', '2024-01-08', '2024-05-30', 6, false, 'Modern UI/UX for administrative tasks', '#8B5CF6'),
('Reporting Engine V2', 'd13c1c5f-46ec-4634-a665-c9f343d91b5b', '2024-02-20', '2024-07-15', 8, false, 'Advanced reporting with custom dashboards', '#F59E0B'),
('Client Onboarding Automation', 'd13c1c5f-46ec-4634-a665-c9f343d91b5b', '2024-03-01', '2024-06-15', 7, false, 'Streamline new client setup process', '#06B6D4'),

-- POS team projects (PEx product)
('Mobile POS App', '14b9e5ab-9dd4-4888-9cfd-975f02fbd9c5', '2024-01-12', '2024-05-15', 9, false, 'iPad and Android POS application', '#10B981'),
('Inventory Management Integration', '14b9e5ab-9dd4-4888-9cfd-975f02fbd9c5', '2024-02-05', '2024-06-30', 8, false, 'Real-time inventory tracking', '#3B82F6'),
('Offline Mode Enhancement', '14b9e5ab-9dd4-4888-9cfd-975f02fbd9c5', '2024-03-10', '2024-07-31', 6, false, 'Improved offline functionality for POS', '#F59E0B'),

-- OPA team projects (PEx product)
('Advanced Analytics Platform', '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57', '2024-01-25', '2024-08-15', 9, true, 'Comprehensive business intelligence platform', '#8B5CF6'),
('Predictive Modeling Engine', '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57', '2024-02-15', '2024-07-30', 10, true, 'AI-driven business predictions and insights', '#EF4444'),
('Data Pipeline Modernization', '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57', '2024-03-05', '2024-06-20', 7, false, 'Upgrade data processing infrastructure', '#06B6D4'),
('Customer Segmentation Tool', '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57', '2024-01-30', '2024-05-31', 8, false, 'Advanced customer categorization system', '#10B981'),
('Real-time Dashboard Framework', '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57', '2024-02-25', '2024-06-10', 6, false, 'Framework for building real-time dashboards', '#F59E0B');

-- Link projects to products
INSERT INTO project_products (project_id, product_id)
SELECT p.id, '96e8f78a-33e7-4827-9b26-72549f417372'::uuid -- TaxSys product
FROM projects p
WHERE p.team_id IN ('b0878bff-71b7-41cc-9d9e-d776103940f3'::uuid, '5a27eb80-4e1d-423a-89b6-7cbf6e92860a'::uuid)
AND p.name IN ('Mobile Tax Calculator', 'API Gateway Redesign', 'AI Tax Assistant', 'Security Audit Implementation', 'Tax Form Builder', 'Customer Analytics Dashboard');

INSERT INTO project_products (project_id, product_id)
SELECT p.id, '0fa3b89a-5386-4241-b895-4e3dabef5156'::uuid -- PEx product
FROM projects p
WHERE p.team_id IN ('fbd5c124-a31d-446d-889c-e12e71567448'::uuid, 'd13c1c5f-46ec-4634-a665-c9f343d91b5b'::uuid, '14b9e5ab-9dd4-4888-9cfd-975f02fbd9c5'::uuid, '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57'::uuid)
AND p.name NOT IN ('Mobile Tax Calculator', 'API Gateway Redesign', 'AI Tax Assistant', 'Security Audit Implementation', 'Tax Form Builder', 'Customer Analytics Dashboard');

-- Assign team members to projects
WITH new_projects AS (
  SELECT id, name, team_id FROM projects 
  WHERE name IN (
    'Mobile Tax Calculator', 'API Gateway Redesign', 'AI Tax Assistant', 'Security Audit Implementation',
    'Tax Form Builder', 'Customer Analytics Dashboard', 'Payment Processing Optimization', 
    'Fraud Detection System', 'Multi-Currency Support', 'Admin Portal Redesign',
    'Reporting Engine V2', 'Client Onboarding Automation', 'Mobile POS App',
    'Inventory Management Integration', 'Offline Mode Enhancement', 'Advanced Analytics Platform',
    'Predictive Modeling Engine', 'Data Pipeline Modernization', 'Customer Segmentation Tool',
    'Real-time Dashboard Framework'
  )
)
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT 
  np.id,
  CASE np.team_id
    WHEN 'b0878bff-71b7-41cc-9d9e-d776103940f3'::uuid THEN 'f243e222-ba03-452b-9e42-02bab630aed0'::uuid -- Alice Johnson for Engineering
    WHEN '5a27eb80-4e1d-423a-89b6-7cbf6e92860a'::uuid THEN '2a24f557-49fd-4390-932b-0c4ad4c732bb'::uuid -- Carol Williams for Product
    WHEN 'fbd5c124-a31d-446d-889c-e12e71567448'::uuid THEN '05f4da5f-1f93-469f-8787-9f45060582e7'::uuid -- Nick Fernandez for Processing
    WHEN 'd13c1c5f-46ec-4634-a665-c9f343d91b5b'::uuid THEN '077d43e9-3d84-410b-aec0-7fc581ba1834'::uuid -- Eve Davis for Client Back Office
    WHEN '14b9e5ab-9dd4-4888-9cfd-975f02fbd9c5'::uuid THEN '77dde75b-917a-4f4a-a3c2-f60407e4a855'::uuid -- Jill Scott for POS
    WHEN '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57'::uuid THEN '5e3934c7-36bc-444e-a8eb-5bbe8388e388'::uuid -- Jan Burks for OPA
  END as team_member_id,
  75 as percent_allocation,
  p.start_date,
  p.end_date
FROM new_projects np
JOIN projects p ON np.id = p.id;