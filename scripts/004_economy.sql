-- ============================================
-- FlyCAD - Economy Extensions (Skins, Upgrades, Battle Pass)
-- ============================================

-- Skins catalog per aircraft
CREATE TABLE IF NOT EXISTS public.aircraft_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  flygold_price BIGINT NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.aircraft_skins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skins_select_published" ON public.aircraft_skins FOR SELECT USING (is_published = true);
CREATE POLICY "skins_insert_admin" ON public.aircraft_skins FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "skins_update_admin" ON public.aircraft_skins FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "skins_delete_admin" ON public.aircraft_skins FOR DELETE USING (auth.uid() IS NOT NULL);

-- Player owned skins
CREATE TABLE IF NOT EXISTS public.player_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skin_id UUID NOT NULL REFERENCES public.aircraft_skins(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, skin_id)
);

ALTER TABLE public.player_skins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_skins_select_own" ON public.player_skins FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "player_skins_insert_own" ON public.player_skins FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "player_skins_delete_own" ON public.player_skins FOR DELETE USING (auth.uid() = player_id);

-- Visual upgrades per aircraft (non-stat, cosmetic)
CREATE TABLE IF NOT EXISTS public.visual_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  flygold_price BIGINT NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visual_upgrades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vup_select_published" ON public.visual_upgrades FOR SELECT USING (is_published = true);
CREATE POLICY "vup_insert_admin" ON public.visual_upgrades FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "vup_update_admin" ON public.visual_upgrades FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "vup_delete_admin" ON public.visual_upgrades FOR DELETE USING (auth.uid() IS NOT NULL);

-- Player owned upgrades
CREATE TABLE IF NOT EXISTS public.player_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upgrade_id UUID NOT NULL REFERENCES public.visual_upgrades(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, upgrade_id)
);

ALTER TABLE public.player_upgrades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pup_select_own" ON public.player_upgrades FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "pup_insert_own" ON public.player_upgrades FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "pup_delete_own" ON public.player_upgrades FOR DELETE USING (auth.uid() = player_id);

-- Ability slots by player
CREATE TABLE IF NOT EXISTS public.player_ability_slots (
  player_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  slots_purchased INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.player_ability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pas_select_own" ON public.player_ability_slots FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "pas_upsert_own" ON public.player_ability_slots FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "pas_update_own" ON public.player_ability_slots FOR UPDATE USING (auth.uid() = player_id);

-- Battle pass seasons and tiers
CREATE TABLE IF NOT EXISTS public.battle_pass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season TEXT NOT NULL,
  tier INT NOT NULL,
  points_required INT NOT NULL,
  reward_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.battle_pass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_select_all" ON public.battle_pass FOR SELECT USING (true);

-- Player progress in battle pass
CREATE TABLE IF NOT EXISTS public.player_battle_pass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  tier INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, season)
);

ALTER TABLE public.player_battle_pass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pbp_select_own" ON public.player_battle_pass FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "pbp_upsert_own" ON public.player_battle_pass FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "pbp_update_own" ON public.player_battle_pass FOR UPDATE USING (auth.uid() = player_id);

