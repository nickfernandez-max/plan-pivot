-- Add default filter preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN default_team_filter TEXT,
ADD COLUMN default_product_filter TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_default_filters ON public.profiles(default_team_filter, default_product_filter);