-- Add timeline months preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN default_timeline_months INTEGER DEFAULT 9;