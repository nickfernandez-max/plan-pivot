-- First, assign the existing teams without products to PEx
UPDATE teams 
SET product_id = '0fa3b89a-5386-4241-b895-4e3dabef5156', 
    updated_at = now()
WHERE product_id IS NULL;

-- Make product_id mandatory for teams
ALTER TABLE teams 
ALTER COLUMN product_id SET NOT NULL;