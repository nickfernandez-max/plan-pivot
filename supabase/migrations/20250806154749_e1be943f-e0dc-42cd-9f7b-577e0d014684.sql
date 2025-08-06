-- Add foreign key constraints to ensure data integrity

-- Add foreign key from projects to teams
ALTER TABLE public.projects 
ADD CONSTRAINT fk_projects_team_id 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add foreign key from team_members to teams  
ALTER TABLE public.team_members 
ADD CONSTRAINT fk_team_members_team_id 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add foreign key from project_assignees to projects
ALTER TABLE public.project_assignees 
ADD CONSTRAINT fk_project_assignees_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add foreign key from project_assignees to team_members
ALTER TABLE public.project_assignees 
ADD CONSTRAINT fk_project_assignees_team_member_id 
FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();