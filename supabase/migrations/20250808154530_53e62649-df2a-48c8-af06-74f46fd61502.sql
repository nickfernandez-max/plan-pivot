-- Harden functions search_path and security
CREATE OR REPLACE FUNCTION public.validate_team_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships t
    WHERE t.team_member_id = NEW.team_member_id
      AND (TG_OP = 'INSERT' OR t.id <> NEW.id)
      AND daterange(t.start_month, COALESCE(t.end_month, 'infinity'::date), '[]') &&
          daterange(NEW.start_month, COALESCE(NEW.end_month, 'infinity'::date), '[]')
  ) INTO overlap_exists;

  IF overlap_exists THEN
    RAISE EXCEPTION 'Overlapping team membership for this team member is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_team_membership_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.team_memberships_history (membership_id, team_member_id, team_id, start_month, end_month, operation)
    VALUES (NEW.id, NEW.team_member_id, NEW.team_id, NEW.start_month, NEW.end_month, 'INSERT');
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.team_memberships_history (membership_id, team_member_id, team_id, start_month, end_month, operation)
    VALUES (NEW.id, NEW.team_member_id, NEW.team_id, NEW.start_month, NEW.end_month, 'UPDATE');
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.team_memberships_history (membership_id, team_member_id, team_id, start_month, end_month, operation)
    VALUES (OLD.id, OLD.team_member_id, OLD.team_id, OLD.start_month, OLD.end_month, 'DELETE');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Enable RLS on history table and add policies (read-only is fine)
ALTER TABLE public.team_memberships_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_memberships_history' AND policyname='Everyone can view team_memberships_history'
  ) THEN
    CREATE POLICY "Everyone can view team_memberships_history" ON public.team_memberships_history FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_memberships_history' AND policyname='No write access to team_memberships_history'
  ) THEN
    CREATE POLICY "No write access to team_memberships_history" ON public.team_memberships_history FOR ALL TO public USING (false) WITH CHECK (false);
  END IF;
END $$;