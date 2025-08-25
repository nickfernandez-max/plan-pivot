-- Update the trigger function to handle NULL assignment dates properly
CREATE OR REPLACE FUNCTION public.update_project_timeline_from_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_min_date DATE;
  v_max_date DATE;
  v_project_id UUID;
BEGIN
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Get the min and max dates from assignments that have valid dates
  SELECT 
    MIN(pa.start_date),
    MAX(pa.end_date)
  INTO v_min_date, v_max_date
  FROM project_assignees pa 
  WHERE pa.project_id = v_project_id
    AND pa.start_date IS NOT NULL 
    AND pa.end_date IS NOT NULL;
  
  -- Only update project dates if we have valid assignment dates
  -- This prevents setting NULL dates on projects which would violate NOT NULL constraints
  IF v_min_date IS NOT NULL AND v_max_date IS NOT NULL THEN
    UPDATE projects 
    SET 
      start_date = v_min_date,
      end_date = v_max_date,
      updated_at = now()
    WHERE id = v_project_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Clean up any existing assignments with NULL dates by setting them to their project's dates
UPDATE project_assignees 
SET 
  start_date = COALESCE(start_date, (SELECT start_date FROM projects WHERE id = project_assignees.project_id)),
  end_date = COALESCE(end_date, (SELECT end_date FROM projects WHERE id = project_assignees.project_id))
WHERE start_date IS NULL OR end_date IS NULL;