-- ============================================
-- Add full_code_json column to aircraft table
-- ============================================

ALTER TABLE public.aircraft 
ADD COLUMN IF NOT EXISTS full_code_json JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.aircraft.full_code_json IS 'Stores the complete aircraft code (parts + specs) from the CAD editor';
