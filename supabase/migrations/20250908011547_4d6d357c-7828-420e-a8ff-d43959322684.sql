-- Temporarily disable RLS on all tables to allow data access
-- This removes the authentication requirement until you decide if you want auth back

ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments DISABLE ROW LEVEL SECURITY;