-- Create table for team ideal sizes by month
CREATE TABLE public.team_ideal_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  ideal_size INTEGER NOT NULL DEFAULT 1,
  start_month DATE NOT NULL, -- YYYY-MM-01 format
  end_month DATE, -- YYYY-MM-01 format, null means ongoing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_ideal_sizes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view team_ideal_sizes" 
ON public.team_ideal_sizes 
FOR SELECT 
USING (true);

CREATE POLICY "Editors and admins can insert team_ideal_sizes" 
ON public.team_ideal_sizes 
FOR INSERT 
WITH CHECK (get_user_role() = ANY (ARRAY['editor'::user_role, 'admin'::user_role]));

CREATE POLICY "Editors and admins can update team_ideal_sizes" 
ON public.team_ideal_sizes 
FOR UPDATE 
USING (get_user_role() = ANY (ARRAY['editor'::user_role, 'admin'::user_role]));

CREATE POLICY "Admins can delete team_ideal_sizes" 
ON public.team_ideal_sizes 
FOR DELETE 
USING (get_user_role() = 'admin'::user_role);

-- Add trigger for updated_at
CREATE TRIGGER update_team_ideal_sizes_updated_at
BEFORE UPDATE ON public.team_ideal_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create validation function to prevent overlapping ideal size periods for same team
CREATE OR REPLACE FUNCTION public.validate_team_ideal_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  overlap_exists BOOLEAN;
BEGIN
  v_start := date_trunc('month', NEW.start_month)::date;
  NEW.start_month := v_start;
  
  IF NEW.end_month IS NOT NULL THEN
    v_end := date_trunc('month', NEW.end_month)::date;
    IF v_end < v_start THEN
      RAISE EXCEPTION 'end_month (%) cannot be before start_month (%)', v_end, v_start;
    END IF;
    NEW.end_month := v_end;
  END IF;

  -- Check for overlapping periods for the same team
  SELECT EXISTS (
    SELECT 1
    FROM public.team_ideal_sizes t
    WHERE t.team_id = NEW.team_id
      AND (TG_OP = 'INSERT' OR t.id <> NEW.id)
      AND daterange(t.start_month, COALESCE(t.end_month, 'infinity'::date), '[]') &&
          daterange(NEW.start_month, COALESCE(NEW.end_month, 'infinity'::date), '[]')
  ) INTO overlap_exists;

  IF overlap_exists THEN
    RAISE EXCEPTION 'Overlapping team ideal size period for this team is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for validation
CREATE TRIGGER validate_team_ideal_size_trigger
BEFORE INSERT OR UPDATE ON public.team_ideal_sizes
FOR EACH ROW
EXECUTE FUNCTION public.validate_team_ideal_size();