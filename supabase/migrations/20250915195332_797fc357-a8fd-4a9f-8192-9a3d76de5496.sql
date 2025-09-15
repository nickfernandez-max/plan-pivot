-- Add position_id field to team_members table for tracking imported employees
ALTER TABLE public.team_members 
ADD COLUMN position_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_team_members_position_id ON public.team_members(position_id);