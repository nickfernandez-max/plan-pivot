-- Create work_assignments table for simple individual work assignments
CREATE TABLE public.work_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  team_member_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('support', 'queue_work', 'other')),
  percent_allocation INTEGER NOT NULL DEFAULT 100 CHECK (percent_allocation > 0 AND percent_allocation <= 100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT DEFAULT '#94A3B8',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for work_assignments
CREATE POLICY "Everyone can view work_assignments" 
ON public.work_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert work_assignments" 
ON public.work_assignments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update work_assignments" 
ON public.work_assignments 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete work_assignments" 
ON public.work_assignments 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_work_assignments_updated_at
BEFORE UPDATE ON public.work_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();