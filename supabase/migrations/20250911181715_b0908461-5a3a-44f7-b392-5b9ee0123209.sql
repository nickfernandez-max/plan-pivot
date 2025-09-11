-- Add financial fields to roles table
ALTER TABLE public.roles 
ADD COLUMN display_name text,
ADD COLUMN finance_name text,
ADD COLUMN hourly_rate decimal(10,2);

-- Update existing roles to have display_name same as name initially
UPDATE public.roles SET display_name = name WHERE display_name IS NULL;