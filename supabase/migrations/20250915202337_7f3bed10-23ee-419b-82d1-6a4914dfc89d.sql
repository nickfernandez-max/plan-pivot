-- Fix the search_path security issue for the set_archived_at function
CREATE OR REPLACE FUNCTION public.set_archived_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.archived = true AND OLD.archived = false THEN
    NEW.archived_at = now();
  ELSIF NEW.archived = false AND OLD.archived = true THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;