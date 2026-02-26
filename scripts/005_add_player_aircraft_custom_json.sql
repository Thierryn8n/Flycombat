-- ============================================
-- Add custom_full_json to player_aircraft table for upgrades
-- ============================================

ALTER TABLE public.player_aircraft 
ADD COLUMN IF NOT EXISTS custom_full_json JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.player_aircraft.custom_full_json IS 'Stores user-specific aircraft configuration (upgrades, specs)';
