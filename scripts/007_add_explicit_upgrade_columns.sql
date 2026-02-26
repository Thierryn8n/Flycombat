-- Add explicit columns for upgrade levels and custom color to player_aircraft
ALTER TABLE public.player_aircraft 
ADD COLUMN IF NOT EXISTS upgrade_speed_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS upgrade_weapons_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS upgrade_resistance_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS upgrade_autoaim_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_primary_color TEXT DEFAULT '#64748b'; -- Default slate color

-- Add comment explaining usage
COMMENT ON COLUMN public.player_aircraft.upgrade_speed_level IS 'Level of speed upgrade (0-5)';
COMMENT ON COLUMN public.player_aircraft.upgrade_weapons_level IS 'Level of weapons upgrade (0-5)';
COMMENT ON COLUMN public.player_aircraft.upgrade_resistance_level IS 'Level of resistance upgrade (0-5)';
COMMENT ON COLUMN public.player_aircraft.upgrade_autoaim_level IS 'Level of auto-aim upgrade (0-5)';
COMMENT ON COLUMN public.player_aircraft.custom_primary_color IS 'Hex color code for aircraft customization';
