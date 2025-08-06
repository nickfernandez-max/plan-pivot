-- Add percent_allocation column to project_assignees table
ALTER TABLE public.project_assignees 
ADD COLUMN percent_allocation INTEGER DEFAULT 100 CHECK (percent_allocation >= 0 AND percent_allocation <= 100);