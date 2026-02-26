-- Add per-type custom colors JSON to player_aircraft
ALTER TABLE public.player_aircraft 
ADD COLUMN IF NOT EXISTS custom_colors_json JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.player_aircraft.custom_colors_json IS 'Per-type color overrides: { wing, engine, fuselage, tail, intake, flap, nozzle, canopy }';
