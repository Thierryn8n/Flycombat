-- ============================================
-- FlyCAD - Complete Database Schema
-- ============================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'admin', 'master')),
  flygold_balance BIGINT DEFAULT 0,
  total_points BIGINT DEFAULT 0,
  total_kills INT DEFAULT 0,
  total_deaths INT DEFAULT 0,
  total_wins INT DEFAULT 0,
  games_played INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- 2. Aircraft table (admin-created aircraft templates)
CREATE TABLE IF NOT EXISTS public.aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'fighter' CHECK (category IN ('fighter', 'bomber', 'transport', 'helicopter', 'experimental')),
  country TEXT,
  parts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_code_json JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  base_speed FLOAT DEFAULT 100,
  base_health FLOAT DEFAULT 100,
  base_damage FLOAT DEFAULT 10,
  base_armor FLOAT DEFAULT 5,
  flygold_price BIGINT DEFAULT 0,
  stripe_price_cents INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aircraft_select_published" ON public.aircraft FOR SELECT USING (is_published = true OR created_by = auth.uid());
CREATE POLICY "aircraft_insert_admin" ON public.aircraft FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "aircraft_update_admin" ON public.aircraft FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "aircraft_delete_admin" ON public.aircraft FOR DELETE USING (auth.uid() = created_by);

-- 3. Player inventory (aircraft owned by players)
CREATE TABLE IF NOT EXISTS public.player_aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, aircraft_id)
);

ALTER TABLE public.player_aircraft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_aircraft_select_own" ON public.player_aircraft FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "player_aircraft_insert_own" ON public.player_aircraft FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "player_aircraft_update_own" ON public.player_aircraft FOR UPDATE USING (auth.uid() = player_id);
CREATE POLICY "player_aircraft_delete_own" ON public.player_aircraft FOR DELETE USING (auth.uid() = player_id);

-- 4. Game sessions
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  max_players INT DEFAULT 20,
  current_players INT DEFAULT 0,
  winner_id UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_sessions_select_all" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "game_sessions_insert_auth" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "game_sessions_update_auth" ON public.game_sessions FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 5. Game results per player per session
CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kills INT DEFAULT 0,
  deaths INT DEFAULT 0,
  points_earned BIGINT DEFAULT 0,
  placement INT,
  aircraft_used UUID REFERENCES public.aircraft(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_results_select_own" ON public.game_results FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "game_results_insert_own" ON public.game_results FOR INSERT WITH CHECK (auth.uid() = player_id);

-- 6. FlyGold transactions
CREATE TABLE IF NOT EXISTS public.flygold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'earned', 'spent', 'refund')),
  description TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.flygold_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flygold_tx_select_own" ON public.flygold_transactions FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "flygold_tx_insert_own" ON public.flygold_transactions FOR INSERT WITH CHECK (auth.uid() = player_id);

-- 7. Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.total_points,
  p.total_kills,
  p.total_deaths,
  p.total_wins,
  p.games_played,
  p.flygold_balance,
  CASE WHEN p.total_deaths > 0
    THEN ROUND(p.total_kills::numeric / p.total_deaths, 2)
    ELSE p.total_kills::numeric
  END as kd_ratio,
  RANK() OVER (ORDER BY p.total_points DESC) as rank_position
FROM public.profiles p
ORDER BY p.total_points DESC;
