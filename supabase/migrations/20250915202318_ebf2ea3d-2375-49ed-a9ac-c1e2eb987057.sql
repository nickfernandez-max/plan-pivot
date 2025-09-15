-- Add archiving columns to teams table
ALTER TABLE public.teams 
ADD COLUMN archived boolean NOT NULL DEFAULT false,
ADD COLUMN archived_at timestamp with time zone;

-- Create index for better query performance on archived teams
CREATE INDEX idx_teams_archived ON public.teams (archived);

-- Create trigger to automatically set archived_at timestamp
CREATE OR REPLACE FUNCTION public.set_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archived = true AND OLD.archived = false THEN
    NEW.archived_at = now();
  ELSIF NEW.archived = false AND OLD.archived = true THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_archived_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_archived_at();