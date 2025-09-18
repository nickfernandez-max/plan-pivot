-- Remove description field from teams table
ALTER TABLE public.teams DROP COLUMN IF EXISTS description;