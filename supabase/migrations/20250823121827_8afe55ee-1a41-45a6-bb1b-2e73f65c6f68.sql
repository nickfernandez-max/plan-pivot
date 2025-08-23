-- Add ideal_size column to teams table
ALTER TABLE public.teams 
ADD COLUMN ideal_size INTEGER DEFAULT 1;