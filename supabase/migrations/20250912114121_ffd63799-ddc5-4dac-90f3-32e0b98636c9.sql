-- Create function to validate assignment dates against project dates
CREATE OR REPLACE FUNCTION public.validate_assignment_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_project_start DATE;
  v_project_end DATE;
BEGIN
  -- Get project dates
  SELECT start_date, end_date 
  INTO v_project_start, v_project_end
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- Only validate if both assignment and project have dates
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL 
     AND v_project_start IS NOT NULL AND v_project_end IS NOT NULL THEN
    
    -- Check if assignment dates are within project boundaries
    IF NEW.start_date < v_project_start OR NEW.end_date > v_project_end THEN
      RAISE WARNING 'Assignment dates (% to %) extend beyond project timeline (% to %)', 
        NEW.start_date, NEW.end_date, v_project_start, v_project_end;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for assignment date validation
CREATE TRIGGER validate_assignment_dates_trigger
  BEFORE INSERT OR UPDATE ON project_assignees
  FOR EACH ROW
  EXECUTE FUNCTION validate_assignment_dates();

-- Update the existing project timeline update function to be more intelligent
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
  v_current_start DATE;
  v_current_end DATE;
  v_assignment_count INTEGER;
BEGIN
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Get current project dates and assignment count
  SELECT start_date, end_date 
  INTO v_current_start, v_current_end
  FROM projects 
  WHERE id = v_project_id;
  
  -- Count assignments with dates
  SELECT COUNT(*)
  INTO v_assignment_count
  FROM project_assignees pa 
  WHERE pa.project_id = v_project_id
    AND pa.start_date IS NOT NULL 
    AND pa.end_date IS NOT NULL;
  
  -- Only proceed if there are assignments with dates
  IF v_assignment_count > 0 THEN
    -- Get the min and max dates from assignments that have valid dates
    SELECT 
      MIN(pa.start_date),
      MAX(pa.end_date)
    INTO v_min_date, v_max_date
    FROM project_assignees pa 
    WHERE pa.project_id = v_project_id
      AND pa.start_date IS NOT NULL 
      AND pa.end_date IS NOT NULL;
    
    -- Only update if:
    -- 1. We have valid assignment dates
    -- 2. AND (project dates would be extended OR all assignments have matching dates)
    IF v_min_date IS NOT NULL AND v_max_date IS NOT NULL THEN
      -- Check if all assignments match current project dates (auto-managed case)
      DECLARE
        v_matching_assignments INTEGER;
      BEGIN
        SELECT COUNT(*)
        INTO v_matching_assignments
        FROM project_assignees pa
        WHERE pa.project_id = v_project_id
          AND pa.start_date = v_current_start
          AND pa.end_date = v_current_end;
        
        -- Update project dates if:
        -- - All assignments match current project dates (auto-managed), OR
        -- - Assignment dates extend beyond current project dates
        IF v_matching_assignments = v_assignment_count OR
           v_min_date < v_current_start OR
           v_max_date > v_current_end THEN
          
          UPDATE projects 
          SET 
            start_date = v_min_date,
            end_date = v_max_date,
            updated_at = now()
          WHERE id = v_project_id;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;