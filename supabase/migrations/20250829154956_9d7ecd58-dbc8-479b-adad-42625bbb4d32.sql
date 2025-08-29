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
SELECT p.id, '96e8f78a-33e7-4827-9b26-72549f417372' -- TaxSys product
FROM projects p
WHERE p.team_id IN ('b0878bff-71b7-41cc-9d9e-d776103940f3', '5a27eb80-4e1d-423a-89b6-7cbf6e92860a')
AND p.name IN ('Mobile Tax Calculator', 'API Gateway Redesign', 'AI Tax Assistant', 'Security Audit Implementation', 'Tax Form Builder', 'Customer Analytics Dashboard');

INSERT INTO project_products (project_id, product_id)
SELECT p.id, '0fa3b89a-5386-4241-b895-4e3dabef5156' -- PEx product
FROM projects p
WHERE p.team_id IN ('fbd5c124-a31d-446d-889c-e12e71567448', 'd13c1c5f-46ec-4634-a665-c9f343d91b5b', '14b9e5ab-9dd4-4888-9cfd-975f02fbd9c5', '8e18a4fa-94e4-4b23-a68f-ba4fd3be3e57')
AND p.name NOT IN ('Mobile Tax Calculator', 'API Gateway Redesign', 'AI Tax Assistant', 'Security Audit Implementation', 'Tax Form Builder', 'Customer Analytics Dashboard');

-- Assign team members to projects with realistic allocation percentages
-- Engineering team assignments
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, 'f243e222-ba03-452b-9e42-02bab630aed0', 80, p.start_date, p.end_date -- Alice Johnson
FROM projects p WHERE p.name = 'Mobile Tax Calculator';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '5fbab560-37c5-476b-be34-ee59a04596fc', 60, p.start_date, p.end_date -- Bob Smith
FROM projects p WHERE p.name = 'API Gateway Redesign';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '2b6ec098-4187-4d7a-aa51-6a61ea41f402', 90, p.start_date, p.end_date -- Frank Wilson
FROM projects p WHERE p.name = 'AI Tax Assistant';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '6c5f9f10-fd78-4e18-a932-37cbb74a457f', 50, p.start_date, p.end_date -- James Scott
FROM projects p WHERE p.name = 'Security Audit Implementation';

-- Product team assignments
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '2a24f557-49fd-4390-932b-0c4ad4c732bb', 70, p.start_date, p.end_date -- Carol Williams
FROM projects p WHERE p.name = 'Tax Form Builder';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '2a24f557-49fd-4390-932b-0c4ad4c732bb', 40, p.start_date, p.end_date -- Carol Williams
FROM projects p WHERE p.name = 'Customer Analytics Dashboard';

-- Processing team assignments
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '05f4da5f-1f93-469f-8787-9f45060582e7', 80, p.start_date, p.end_date -- Nick Fernandez
FROM projects p WHERE p.name = 'Payment Processing Optimization';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '8ef7d30f-7d20-47ec-8451-5d9b42a488ff', 90, p.start_date, p.end_date -- David Brown
FROM projects p WHERE p.name = 'Fraud Detection System';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '05f4da5f-1f93-469f-8787-9f45060582e7', 60, p.start_date, p.end_date -- Nick Fernandez
FROM projects p WHERE p.name = 'Multi-Currency Support';

-- Client Back Office team assignments
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '077d43e9-3d84-410b-aec0-7fc581ba1834', 75, p.start_date, p.end_date -- Eve Davis
FROM projects p WHERE p.name = 'Admin Portal Redesign';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '077d43e9-3d84-410b-aec0-7fc581ba1834', 85, p.start_date, p.end_date -- Eve Davis
FROM projects p WHERE p.name = 'Reporting Engine V2';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '077d43e9-3d84-410b-aec0-7fc581ba1834', 50, p.start_date, p.end_date -- Eve Davis
FROM projects p WHERE p.name = 'Client Onboarding Automation';

-- POS team assignments
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '77dde75b-917a-4f4a-a3c2-f60407e4a855', 80, p.start_date, p.end_date -- Jill Scott
FROM projects p WHERE p.name = 'Mobile POS App';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '77dde75b-917a-4f4a-a3c2-f60407e4a855', 70, p.start_date, p.end_date -- Jill Scott
FROM projects p WHERE p.name = 'Inventory Management Integration';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '77dde75b-917a-4f4a-a3c2-f60407e4a855', 60, p.start_date, p.end_date -- Jill Scott
FROM projects p WHERE p.name = 'Offline Mode Enhancement';

-- OPA team assignments
INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '5e3934c7-36bc-444e-a8eb-5bbe8388e388', 90, p.start_date, p.end_date -- Jan Burks
FROM projects p WHERE p.name = 'Advanced Analytics Platform';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '5e3934c7-36bc-444e-a8eb-5bbe8388e388', 80, p.start_date, p.end_date -- Jan Burks
FROM projects p WHERE p.name = 'Predictive Modeling Engine';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '5e3934c7-36bc-444e-a8eb-5bbe8388e388', 65, p.start_date, p.end_date -- Jan Burks
FROM projects p WHERE p.name = 'Data Pipeline Modernization';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '5e3934c7-36bc-444e-a8eb-5bbe8388e388', 70, p.start_date, p.end_date -- Jan Burks
FROM projects p WHERE p.name = 'Customer Segmentation Tool';

INSERT INTO project_assignees (project_id, team_member_id, percent_allocation, start_date, end_date)
SELECT p.id, '5e3934c7-36bc-444e-a8eb-5bbe8388e388', 55, p.start_date, p.end_date -- Jan Burks
FROM projects p WHERE p.name = 'Real-time Dashboard Framework';