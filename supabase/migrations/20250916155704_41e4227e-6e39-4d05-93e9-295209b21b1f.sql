-- Fix existing tentative projects by assigning team products
INSERT INTO project_products (project_id, product_id)
SELECT 
  p.id as project_id,
  t.product_id
FROM projects p
JOIN teams t ON p.team_id = t.id
WHERE p.status_visibility = 'tentative'
  AND t.product_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_products pp 
    WHERE pp.project_id = p.id AND pp.product_id = t.product_id
  );