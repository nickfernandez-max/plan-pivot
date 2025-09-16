-- Add a status field to projects table to distinguish between published and tentative projects
ALTER TABLE public.projects 
ADD COLUMN status_visibility text NOT NULL DEFAULT 'published' 
CHECK (status_visibility IN ('published', 'tentative'));

-- Add index for performance on the new column
CREATE INDEX idx_projects_status_visibility ON public.projects(status_visibility);