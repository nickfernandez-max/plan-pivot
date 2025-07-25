-- Create Teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Team Members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value_score INTEGER NOT NULL DEFAULT 1 CHECK (value_score >= 1 AND value_score <= 10),
  is_rd BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Project Assignees junction table
CREATE TABLE public.project_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_member_id)
);

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (since this is a roadmap tool that should be viewable by everyone)
CREATE POLICY "Everyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Everyone can insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update teams" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete teams" ON public.teams FOR DELETE USING (true);

CREATE POLICY "Everyone can view team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Everyone can insert team_members" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update team_members" ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete team_members" ON public.team_members FOR DELETE USING (true);

CREATE POLICY "Everyone can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Everyone can insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete projects" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_assignees" ON public.project_assignees FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_assignees" ON public.project_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_assignees" ON public.project_assignees FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_assignees" ON public.project_assignees FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
-- Teams
INSERT INTO public.teams (name, description, color) VALUES 
  ('Engineering', 'Software development team', '#3B82F6'),
  ('Product', 'Product management team', '#10B981'),
  ('Design', 'User experience and design team', '#F59E0B'),
  ('Marketing', 'Marketing and growth team', '#EF4444');

-- Team Members
INSERT INTO public.team_members (name, role, team_id, start_date) VALUES 
  ('Alice Johnson', 'Senior Developer', (SELECT id FROM public.teams WHERE name = 'Engineering'), '2024-01-15'),
  ('Bob Smith', 'Frontend Developer', (SELECT id FROM public.teams WHERE name = 'Engineering'), '2024-02-01'),
  ('Carol Williams', 'Product Manager', (SELECT id FROM public.teams WHERE name = 'Product'), '2024-01-10'),
  ('David Brown', 'UX Designer', (SELECT id FROM public.teams WHERE name = 'Design'), '2024-01-20'),
  ('Eve Davis', 'Marketing Specialist', (SELECT id FROM public.teams WHERE name = 'Marketing'), '2024-02-15'),
  ('Frank Wilson', 'Backend Developer', (SELECT id FROM public.teams WHERE name = 'Engineering'), '2024-01-05');

-- Projects
INSERT INTO public.projects (name, team_id, start_date, end_date, value_score, is_rd, description) VALUES 
  ('Mobile App Redesign', (SELECT id FROM public.teams WHERE name = 'Design'), '2024-03-01', '2024-05-15', 8, false, 'Complete redesign of mobile application'),
  ('API v2 Development', (SELECT id FROM public.teams WHERE name = 'Engineering'), '2024-02-15', '2024-06-30', 9, true, 'Next generation API development'),
  ('Customer Analytics Dashboard', (SELECT id FROM public.teams WHERE name = 'Product'), '2024-04-01', '2024-07-01', 7, false, 'Analytics dashboard for customer insights'),
  ('Brand Identity Refresh', (SELECT id FROM public.teams WHERE name = 'Marketing'), '2024-03-15', '2024-05-30', 6, false, 'Complete brand identity refresh'),
  ('Machine Learning Pipeline', (SELECT id FROM public.teams WHERE name = 'Engineering'), '2024-05-01', '2024-08-15', 10, true, 'Advanced ML pipeline for data processing');

-- Project Assignees
INSERT INTO public.project_assignees (project_id, team_member_id) VALUES 
  ((SELECT id FROM public.projects WHERE name = 'Mobile App Redesign'), (SELECT id FROM public.team_members WHERE name = 'David Brown')),
  ((SELECT id FROM public.projects WHERE name = 'API v2 Development'), (SELECT id FROM public.team_members WHERE name = 'Alice Johnson')),
  ((SELECT id FROM public.projects WHERE name = 'API v2 Development'), (SELECT id FROM public.team_members WHERE name = 'Frank Wilson')),
  ((SELECT id FROM public.projects WHERE name = 'Customer Analytics Dashboard'), (SELECT id FROM public.team_members WHERE name = 'Carol Williams')),
  ((SELECT id FROM public.projects WHERE name = 'Customer Analytics Dashboard'), (SELECT id FROM public.team_members WHERE name = 'Bob Smith')),
  ((SELECT id FROM public.projects WHERE name = 'Brand Identity Refresh'), (SELECT id FROM public.team_members WHERE name = 'Eve Davis')),
  ((SELECT id FROM public.projects WHERE name = 'Machine Learning Pipeline'), (SELECT id FROM public.team_members WHERE name = 'Alice Johnson'));