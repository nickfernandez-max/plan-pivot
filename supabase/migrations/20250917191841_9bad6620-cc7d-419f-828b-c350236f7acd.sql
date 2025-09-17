-- Add team member sorting preferences to profiles table
ALTER TABLE public.profiles ADD COLUMN team_member_primary_sort text DEFAULT 'role';
ALTER TABLE public.profiles ADD COLUMN team_member_primary_direction text DEFAULT 'asc';
ALTER TABLE public.profiles ADD COLUMN team_member_secondary_sort text DEFAULT 'name';
ALTER TABLE public.profiles ADD COLUMN team_member_secondary_direction text DEFAULT 'asc';