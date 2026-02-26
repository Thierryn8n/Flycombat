// Centralized game balance and constants
export const GAME_CONFIG = {
  // Match
  MATCH_DURATION: 600, // seconds
  STORM_INITIAL_RADIUS: 600,
  STORM_MIN_RADIUS: 80,
  STORM_SHRINK_RATE: 0.35,
  STORM_DAMAGE: 8,
  WORLD_SIZE: 1400,
  MAX_ALTITUDE: 300,

  // Runway
  RUNWAY_LENGTH: 200,
  RUNWAY_WIDTH: 22,

  // Combat
  BULLET_SPEED: 160,
  BULLET_DAMAGE: 12,
  FIRE_RATE: 120, // ms
  MISSILE_SPEED: 95,
  MISSILE_TURN_RATE: 2.2,
  MISSILE_DAMAGE: 35,
  MISSILE_LOCK_RANGE: 120,
  MISSILE_LIFETIME: 6000, // ms
  MINE_TRIGGER_RADIUS: 20,
  MINE_DAMAGE: 40,
  MINE_LIFETIME: 25000, // ms
  EMP_RADIUS: 80,
  EMP_DAMAGE: 20,

  // Player
  POINTS_PER_KILL: 150,
  POINTS_PER_BONUS: 25,
  POINTS_PER_SECOND_ALIVE: 2,
  RESPAWN_DELAY: 4000, // ms
  RESPAWN_INVULN: 2500, // ms

  // Bonus durations
  BONUS_SPEED_MULT: 1.45,
  BONUS_SPEED_DURATION: 12000, // ms
  BONUS_RESIST_MULT: 0.65,
  BONUS_RESIST_DURATION: 12000, // ms
  BONUS_HEAL_AMOUNT: 35,

  // Collision
  CRASH_SPEED_THRESHOLD: 30,
  TERRAIN_COLLISION_DAMAGE: 15,
  OBSTACLE_COLLISION_DAMAGE: 18,
} as const

export type BonusType = "speed" | "resistance" | "heal" | "missile" | "emp" | "mine"

export interface ActiveBonus {
  type: BonusType
  expiresAt: number
  remainingMs: number
}

export const BONUS_COLORS: Record<BonusType, string> = {
  speed: "#3B82F6",
  resistance: "#F59E0B",
  heal: "#22C55E",
  missile: "#EF4444",
  emp: "#6366F1",
  mine: "#14B8A6",
}
