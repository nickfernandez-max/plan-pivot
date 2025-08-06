-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Everyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete products" 
ON public.products 
FOR DELETE 
USING (true);

-- Add product_id to teams table
ALTER TABLE public.teams 
ADD COLUMN product_id UUID REFERENCES public.products(id);

-- Create project_products junction table for many-to-many relationship
CREATE TABLE public.project_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, product_id)
);

-- Enable Row Level Security on project_products
ALTER TABLE public.project_products ENABLE ROW LEVEL SECURITY;

-- Create policies for project_products
CREATE POLICY "Everyone can view project_products" 
ON public.project_products 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert project_products" 
ON public.project_products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update project_products" 
ON public.project_products 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete project_products" 
ON public.project_products 
FOR DELETE 
USING (true);

-- Add trigger for products updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();