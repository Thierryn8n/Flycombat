// Store types for game entities
export interface LocalPlayer {
  hp: number
  maxHp: number
  speed: number
  baseSpeed: number
  handling: number
  points: number
  alive: boolean
  bonuses: ActiveBonus[]
  position: [number, number, number]
  rotation: [number, number, number]
  velocity: [number, number, number]
  aircraftColor: string
  aircraftName: string
  displayName?: string
  avatarUrl?: string
  avatarIcon?: string
  missiles: number
  emps: number
  mines: number
  stunned: boolean
  stunnedUntil: number
  invulnerable: boolean
  invulnerableUntil: number
  respawnTimer: number
  deaths: number
  autoAimLevel: number // 0-10
}

export interface EnemyPlayer {
  id: string
  displayName: string
  position: [number, number, number]
  rotation: [number, number, number]
  hp: number
  maxHp: number
  alive: boolean
  aircraftColor: string
  points: number
  bonuses: ActiveBonus[]
  avatarUrl?: string
  avatarIcon?: string
  aircraftName?: string
  aircraftImage?: string
}

export interface Bullet {
  id: string
  position: [number, number, number]
  direction: [number, number, number]
  ownerId: string
  createdAt: number
}

export interface Missile {
  id: string
  position: [number, number, number]
  direction: [number, number, number]
  ownerId: string
  targetId: string
  createdAt: number
}

export interface AirMine {
  id: string
  position: [number, number, number]
  ownerId: string
  createdAt: number
}

export interface BonusPickup {
  id: string
  type: import("./types").BonusType
  position: [number, number, number]
  collected: boolean
}

export interface KillFeedEntry {
  killer: string
  victim: string
  timestamp: number
}

export interface ActiveBonus {
  type: import("./types").BonusType
  expiresAt: number
  remainingMs: number
}
