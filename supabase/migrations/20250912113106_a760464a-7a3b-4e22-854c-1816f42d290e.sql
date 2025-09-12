-- Add preferred_landing_page column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_landing_page TEXT DEFAULT '/' CHECK (preferred_landing_page IN ('/', '/roadmap'));