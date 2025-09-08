-- Create user profiles table with roles
CREATE TYPE public.user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can view all profiles but only update their own
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'editor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update all existing table policies to require authentication

-- Projects policies
DROP POLICY IF EXISTS "Everyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Everyone can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Everyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Everyone can delete projects" ON public.projects;

CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert projects" ON public.projects
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update projects" ON public.projects
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Teams policies
DROP POLICY IF EXISTS "Everyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Everyone can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Everyone can update teams" ON public.teams;
DROP POLICY IF EXISTS "Everyone can delete teams" ON public.teams;

CREATE POLICY "Authenticated users can view teams" ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert teams" ON public.teams
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update teams" ON public.teams
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete teams" ON public.teams
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Products policies
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
DROP POLICY IF EXISTS "Everyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Everyone can update products" ON public.products;
DROP POLICY IF EXISTS "Everyone can delete products" ON public.products;

CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert products" ON public.products
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update products" ON public.products
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Team members policies
DROP POLICY IF EXISTS "Everyone can view team_members" ON public.team_members;
DROP POLICY IF EXISTS "Everyone can insert team_members" ON public.team_members;
DROP POLICY IF EXISTS "Everyone can update team_members" ON public.team_members;
DROP POLICY IF EXISTS "Everyone can delete team_members" ON public.team_members;

CREATE POLICY "Authenticated users can view team_members" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert team_members" ON public.team_members
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update team_members" ON public.team_members
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete team_members" ON public.team_members
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Roles policies
DROP POLICY IF EXISTS "Everyone can view roles" ON public.roles;
DROP POLICY IF EXISTS "Everyone can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Everyone can update roles" ON public.roles;
DROP POLICY IF EXISTS "Everyone can delete roles" ON public.roles;

CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert roles" ON public.roles
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update roles" ON public.roles
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete roles" ON public.roles
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Project assignees policies
DROP POLICY IF EXISTS "Everyone can view project_assignees" ON public.project_assignees;
DROP POLICY IF EXISTS "Everyone can insert project_assignees" ON public.project_assignees;
DROP POLICY IF EXISTS "Everyone can update project_assignees" ON public.project_assignees;
DROP POLICY IF EXISTS "Everyone can delete project_assignees" ON public.project_assignees;

CREATE POLICY "Authenticated users can view project_assignees" ON public.project_assignees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert project_assignees" ON public.project_assignees
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update project_assignees" ON public.project_assignees
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete project_assignees" ON public.project_assignees
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Project products policies
DROP POLICY IF EXISTS "Everyone can view project_products" ON public.project_products;
DROP POLICY IF EXISTS "Everyone can insert project_products" ON public.project_products;
DROP POLICY IF EXISTS "Everyone can update project_products" ON public.project_products;
DROP POLICY IF EXISTS "Everyone can delete project_products" ON public.project_products;

CREATE POLICY "Authenticated users can view project_products" ON public.project_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert project_products" ON public.project_products
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update project_products" ON public.project_products
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete project_products" ON public.project_products
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Team memberships policies
DROP POLICY IF EXISTS "Everyone can view team_memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Everyone can insert team_memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Everyone can update team_memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Everyone can delete team_memberships" ON public.team_memberships;

CREATE POLICY "Authenticated users can view team_memberships" ON public.team_memberships
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert team_memberships" ON public.team_memberships
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update team_memberships" ON public.team_memberships
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete team_memberships" ON public.team_memberships
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

-- Work assignments policies
DROP POLICY IF EXISTS "Everyone can view work_assignments" ON public.work_assignments;
DROP POLICY IF EXISTS "Everyone can insert work_assignments" ON public.work_assignments;
DROP POLICY IF EXISTS "Everyone can update work_assignments" ON public.work_assignments;
DROP POLICY IF EXISTS "Everyone can delete work_assignments" ON public.work_assignments;

CREATE POLICY "Authenticated users can view work_assignments" ON public.work_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert work_assignments" ON public.work_assignments
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Editors and admins can update work_assignments" ON public.work_assignments
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "Admins can delete work_assignments" ON public.work_assignments
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');