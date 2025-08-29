-- Create roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create policies for roles table
CREATE POLICY "Everyone can view roles" 
ON public.roles 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert roles" 
ON public.roles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update roles" 
ON public.roles 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete roles" 
ON public.roles 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing roles from team_members table
INSERT INTO public.roles (name)
SELECT DISTINCT role 
FROM public.team_members 
WHERE role IS NOT NULL AND role != ''
ORDER BY role;

-- Add role_id column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN role_id UUID REFERENCES public.roles(id);

-- Update team_members to reference the new roles
UPDATE public.team_members 
SET role_id = r.id 
FROM public.roles r 
WHERE public.team_members.role = r.name;

-- Make role_id NOT NULL after populating it
ALTER TABLE public.team_members 
ALTER COLUMN role_id SET NOT NULL;

-- Drop the old role column
ALTER TABLE public.team_members 
DROP COLUMN role;