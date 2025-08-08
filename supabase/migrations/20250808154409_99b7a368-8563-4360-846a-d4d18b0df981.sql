-- 1) Create team_memberships table (people_team_assignments)
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  start_month DATE NOT NULL,
  end_month DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Open policies (match existing project tables policies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_memberships' AND policyname='Everyone can view team_memberships'
  ) THEN
    CREATE POLICY "Everyone can view team_memberships" ON public.team_memberships FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_memberships' AND policyname='Everyone can insert team_memberships'
  ) THEN
    CREATE POLICY "Everyone can insert team_memberships" ON public.team_memberships FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_memberships' AND policyname='Everyone can update team_memberships'
  ) THEN
    CREATE POLICY "Everyone can update team_memberships" ON public.team_memberships FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_memberships' AND policyname='Everyone can delete team_memberships'
  ) THEN
    CREATE POLICY "Everyone can delete team_memberships" ON public.team_memberships FOR DELETE USING (true);
  END IF;
END $$;

-- Updated_at trigger function (re-use if exists, else already present as public.update_updated_at_column)
DROP TRIGGER IF EXISTS trg_team_memberships_updated_at ON public.team_memberships;
CREATE TRIGGER trg_team_memberships_updated_at
BEFORE UPDATE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Validation trigger to enforce month granularity and no overlaps per person
CREATE OR REPLACE FUNCTION public.validate_team_membership()
RETURNS TRIGGER AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  overlap_exists BOOLEAN;
BEGIN
  -- Truncate to month start
  v_start := date_trunc('month', NEW.start_month)::date;
  NEW.start_month := v_start;
  IF NEW.end_month IS NOT NULL THEN
    v_end := date_trunc('month', NEW.end_month)::date;
    IF v_end < v_start THEN
      RAISE EXCEPTION 'end_month (%) cannot be before start_month (%)', v_end, v_start;
    END IF;
    NEW.end_month := v_end;
  END IF;

  -- Ensure no overlapping periods for the same team_member
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_team_membership_ins ON public.team_memberships;
DROP TRIGGER IF EXISTS trg_validate_team_membership_upd ON public.team_memberships;
CREATE TRIGGER trg_validate_team_membership_ins
BEFORE INSERT ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.validate_team_membership();
CREATE TRIGGER trg_validate_team_membership_upd
BEFORE UPDATE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.validate_team_membership();

-- 3) History/versioning table and trigger
CREATE TABLE IF NOT EXISTS public.team_memberships_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  team_id UUID NOT NULL,
  start_month DATE,
  end_month DATE,
  operation TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.log_team_membership_history()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_team_membership_history_ins ON public.team_memberships;
DROP TRIGGER IF EXISTS trg_log_team_membership_history_upd ON public.team_memberships;
DROP TRIGGER IF EXISTS trg_log_team_membership_history_del ON public.team_memberships;
CREATE TRIGGER trg_log_team_membership_history_ins
AFTER INSERT ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.log_team_membership_history();
CREATE TRIGGER trg_log_team_membership_history_upd
AFTER UPDATE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.log_team_membership_history();
CREATE TRIGGER trg_log_team_membership_history_del
AFTER DELETE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.log_team_membership_history();

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_team_memberships_member ON public.team_memberships(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_member_start ON public.team_memberships(team_member_id, start_month);

-- 5) Backfill from current team_members
INSERT INTO public.team_memberships (team_member_id, team_id, start_month, end_month)
SELECT tm.id, tm.team_id, date_trunc('month', tm.start_date)::date, NULL
FROM public.team_members tm
WHERE tm.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_memberships t
    WHERE t.team_member_id = tm.id
  );