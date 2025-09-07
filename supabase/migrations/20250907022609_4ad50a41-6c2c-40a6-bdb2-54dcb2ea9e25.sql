-- Create enum type for project status
CREATE TYPE public.project_status AS ENUM ('Logged', 'Planned', 'In Progress', 'Blocked', 'On Hold', 'Complete');

-- Add status column to projects table
ALTER TABLE public.projects 
ADD COLUMN status project_status NOT NULL DEFAULT 'Logged';

-- Create index for status filtering
CREATE INDEX idx_projects_status ON public.projects(status);