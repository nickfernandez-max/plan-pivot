-- Remove finance_name and hourly_rate columns from roles table
ALTER TABLE public.roles 
DROP COLUMN IF EXISTS finance_name,
DROP COLUMN IF EXISTS hourly_rate;