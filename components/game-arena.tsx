"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Sky, Text, Html, useKeyboardControls, KeyboardControls } from "@react-three/drei"
import * as THREE from "three"
import { AircraftPart } from "@/lib/aircraft-database"
import { PartMesh } from "@/components/game/part-mesh"
import { setGuestPoints } from "@/lib/guest-storage"

// ====== GAME CONFIG ======
const WORLD_SIZE = 500
const CLOUD_HEIGHT = 60
const BONUS_COUNT = 30
const OBSTACLE_COUNT = 40
const BOT_COUNT = 8
const RUNWAY_LENGTH = 80
const RUNWAY_WIDTH = 10

type BonusType = "speed" | "resistance" | "heal"
interface Bonus {
  id: number
  type: BonusType
  position: THREE.Vector3
  collected: boolean
  respawnAt: number
}
interface Obstacle {
  id: number
  position: THREE.Vector3
  size: [number, number, number]
}
interface Bot {
  id: number
  name: string
  position: THREE.Vector3
  direction: THREE.Vector3
  health: number
  score: number
  bonuses: { type: BonusType; expiresAt: number }[]
  alive: boolean
}
interface PlayerState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  health: number
  maxHealth: number
  score: number
  flygold: number
  speed: number
  baseSpeed: number
  bonuses: { type: BonusType; expiresAt: number }[]
  kills: number
  alive: boolean
}

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

// ====== RUNWAY ======
function Runway() {
  return (
    <group position={[0, 0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RUNWAY_WIDTH, RUNWAY_LENGTH]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.3, RUNWAY_LENGTH - 4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* markings */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[RUNWAY_WIDTH / 2 - 0.5, 0.01, -RUNWAY_LENGTH / 2 + 8 * i + 4]}>
          <planeGeometry args={[0.15, 4]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
      ))}
    </group>
  )
}

// ====== GROUND ======
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[WORLD_SIZE * 2, WORLD_SIZE * 2]} />
      <meshStandardMaterial color="#1a4726" />
    </mesh>
  )
}

// ====== CLOUDS ======
function Clouds() {
  const clouds = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      pos: [
        randomInRange(-WORLD_SIZE, WORLD_SIZE),
        randomInRange(CLOUD_HEIGHT - 15, CLOUD_HEIGHT + 30),
        randomInRange(-WORLD_SIZE, WORLD_SIZE),
      ] as [number, number, number],
      scale: randomInRange(8, 25),
    }))
  }, [])

  return (
    <group>
      {clouds.map((c) => (
        <mesh key={c.id} position={c.pos}>
          <sphereGeometry args={[c.scale, 8, 6]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ====== BONUS ITEM ======
function BonusItem({ bonus, onCollect }: { bonus: Bonus; onCollect: (id: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const colors: Record<BonusType, string> = { speed: "#3b82f6", resistance: "#f59e0b", heal: "#22c55e" }

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2
      meshRef.current.position.y = bonus.position.y + Math.sin(Date.now() * 0.003) * 0.5
    }
  })

  if (bonus.collected) return null

  return (
    <mesh ref={meshRef} position={[bonus.position.x, bonus.position.y, bonus.position.z]}>
      <octahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial color={colors[bonus.type]} emissive={colors[bonus.type]} emissiveIntensity={0.5} />
    </mesh>
  )
}

// ====== OBSTACLE ======
function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  return (
    <mesh position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
      <boxGeometry args={obstacle.size} />
      <meshStandardMaterial color="#991b1b" transparent opacity={0.8} />
    </mesh>
  )
}

// ====== BOT AIRCRAFT ======
function BotAircraft({ bot }: { bot: Bot }) {
  const meshRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (meshRef.current && bot.alive) {
      meshRef.current.position.copy(bot.position)
      meshRef.current.lookAt(
        bot.position.x + bot.direction.x * 10,
        bot.position.y + bot.direction.y * 10,
        bot.position.z + bot.direction.z * 10
      )
    }
  })

  if (!bot.alive) return null

  return (
    <group ref={meshRef}>
      {/* fuselage */}
      <mesh>
        <boxGeometry args={[1.2, 0.5, 3]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* wings */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5, 0.1, 1.2]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* tail */}
      <mesh position={[0, 0.4, 1.3]}>
        <boxGeometry args={[0.1, 0.8, 0.6]} />
        <meshStandardMaterial color="#b91c1c" />
      </mesh>
      {/* health bar */}
      <Html position={[0, 1.5, 0]} center>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-foreground font-mono bg-background/70 px-1 rounded">
            {bot.name}
          </span>
          <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${bot.health}%` }}
            />
          </div>
        </div>
      </Html>
    </group>
  )
}

// ====== PLAYER AIRCRAFT ======
function PlayerAircraft({
  playerRef,
  state,
  parts,
}: {
  playerRef: React.MutableRefObject<PlayerState>
  state: PlayerState
  parts?: AircraftPart[]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  useFrame((_, delta) => {
    if (!groupRef.current || !state.alive) return

    const group = groupRef.current
    group.position.copy(state.position)

    // Camera follows behind player
    const offset = new THREE.Vector3(0, 8, 20)
    offset.applyQuaternion(group.quaternion)
    const camTarget = state.position.clone().add(offset)
    camera.position.lerp(camTarget, 5 * delta)

    const lookTarget = state.position.clone().add(
      state.velocity.clone().normalize().multiplyScalar(20)
    )
    camera.lookAt(lookTarget)
  })

  if (!state.alive) return null

  if (parts && parts.length > 0) {
    return (
      <group ref={groupRef}>
        {parts.map((part) => (
          <PartMesh key={part.id + Math.random()} part={part} />
        ))}
      </group>
    )
  }

  return (
    <group ref={groupRef}>
      {/* fuselage */}
      <mesh>
        <boxGeometry args={[1.5, 0.6, 4]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* wings */}
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[7, 0.12, 1.8]} />
        <meshStandardMaterial color="#2563eb" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* tail v */}
      <mesh position={[0, 0.6, 1.8]}>
        <boxGeometry args={[0.12, 1.2, 0.8]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {/* tail h */}
      <mesh position={[0, 0.15, 1.8]}>
        <boxGeometry args={[2.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {/* cockpit */}
      <mesh position={[0, 0.4, -1.0]}>
        <boxGeometry args={[0.8, 0.5, 1.0]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.7} />
      </mesh>
      {/* engines glow */}
      <mesh position={[0.4, -0.1, 2.2]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-0.4, -0.1, 2.2]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

// ====== PROJECTILE ======
function Projectiles({ projectiles }: { projectiles: { id: number; pos: THREE.Vector3; dir: THREE.Vector3 }[] }) {
  return (
    <group>
      {projectiles.map((p) => (
        <mesh key={p.id} position={[p.pos.x, p.pos.y, p.pos.z]}>
          <sphereGeometry args={[0.15, 4, 4]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={3} />
        </mesh>
      ))}
    </group>
  )
}

// ====== GAME SCENE ======
function GameScene({
  onScoreChange,
  onHealthChange,
  onBonusCollect,
  onKill,
  onDeath,
  onStateUpdate,
  selectedAircraft,
  parts,
  upgrades,
}: {
  onScoreChange: (score: number) => void
  onHealthChange: (health: number) => void
  onBonusCollect: (type: BonusType) => void
  onKill: (botName: string, stolenScore: number) => void
  onDeath: () => void
  onStateUpdate: (state: PlayerState) => void
  selectedAircraft?: { speed?: number; health?: number; damage?: number; armor?: number }
  parts?: AircraftPart[]
  upgrades?: { speed: number; weapons: number; resistance: number; autoaim: number }
}) {
  const keysRef = useRef({ w: false, s: false, a: false, d: false, space: false, shift: false, q: false, e: false })
  const speedLevel = upgrades?.speed ?? 0
  const weaponsLevel = upgrades?.weapons ?? 0
  const resistanceLevel = upgrades?.resistance ?? 0
  const autoAimLevel = upgrades?.autoaim ?? 0
  const baseHealthRaw = Math.max(50, Math.min(1000, selectedAircraft?.health ?? 100))
  const baseHealth = Math.max(50, Math.min(1500, Math.floor(baseHealthRaw * (1 + 0.05 * resistanceLevel))))
  const baseSpeedRaw = Math.max(0.4, Math.min(2.5, (selectedAircraft?.speed ?? 500) / 800))
  const baseSpeed = Math.max(0.4, Math.min(3, baseSpeedRaw * (1 + 0.05 * speedLevel)))
  const autoAimChance = Math.min(1, 0.20 + 0.05 * autoAimLevel)
  const damageMultiplier = 1 + 0.05 * weaponsLevel
  const playerRef = useRef<PlayerState>({
    position: new THREE.Vector3(0, 5, -RUNWAY_LENGTH / 2),
    velocity: new THREE.Vector3(0, 0, -1),
    health: baseHealth,
    maxHealth: baseHealth,
    score: 0,
    flygold: 0,
    speed: baseSpeed,
    baseSpeed: baseSpeed,
    bonuses: [],
    kills: 0,
    alive: true,
  })

  const [playerState, setPlayerState] = useState<PlayerState>({ ...playerRef.current })
  const [projectiles, setProjectiles] = useState<{ id: number; pos: THREE.Vector3; dir: THREE.Vector3; life: number }[]>([])
  const projectileIdRef = useRef(0)
  const shootCooldownRef = useRef(0)

  const [bonuses, setBonuses] = useState<Bonus[]>(() =>
    Array.from({ length: BONUS_COUNT }).map((_, i) => ({
      id: i,
      type: (["speed", "resistance", "heal"] as BonusType[])[i % 3],
      position: new THREE.Vector3(
        randomInRange(-WORLD_SIZE * 0.6, WORLD_SIZE * 0.6),
        randomInRange(10, CLOUD_HEIGHT + 20),
        randomInRange(-WORLD_SIZE * 0.6, WORLD_SIZE * 0.6)
      ),
      collected: false,
      respawnAt: 0,
    }))
  )

  const [obstacles] = useState<Obstacle[]>(() =>
    Array.from({ length: OBSTACLE_COUNT }).map((_, i) => ({
      id: i,
      position: new THREE.Vector3(
        randomInRange(-WORLD_SIZE * 0.5, WORLD_SIZE * 0.5),
        randomInRange(5, CLOUD_HEIGHT),
        randomInRange(-WORLD_SIZE * 0.5, WORLD_SIZE * 0.5)
      ),
      size: [
        randomInRange(3, 12),
        randomInRange(3, 12),
        randomInRange(3, 12),
      ] as [number, number, number],
    }))
  )

  const botsRef = useRef<Bot[]>(
    Array.from({ length: BOT_COUNT }).map((_, i) => ({
      id: i,
      name: `Bot-${i + 1}`,
      position: new THREE.Vector3(
        randomInRange(-200, 200),
        randomInRange(20, 50),
        randomInRange(-200, 200)
      ),
      direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
      health: 100,
      score: Math.floor(Math.random() * 500),
      bonuses: [],
      alive: true,
    }))
  )
  const [bots, setBots] = useState(botsRef.current)

  // Key handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k in keysRef.current) (keysRef.current as Record<string, boolean>)[k] = true
      if (k === " ") keysRef.current.space = true
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k in keysRef.current) (keysRef.current as Record<string, boolean>)[k] = false
      if (k === " ") keysRef.current.space = false
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  useFrame((_, delta) => {
    const p = playerRef.current
    if (!p.alive) return

    const keys = keysRef.current
    const dt = Math.min(delta, 0.05) // cap delta

    // Process active bonuses
    const now = Date.now()
    p.bonuses = p.bonuses.filter((b) => b.expiresAt > now)
    const hasSpeedBoost = p.bonuses.some((b) => b.type === "speed")
    const hasResistance = p.bonuses.some((b) => b.type === "resistance")
    p.speed = p.baseSpeed * (hasSpeedBoost ? 2 : 1)

    // Steer
    const turnSpeed = 1.5 * dt
    if (keys.a) {
      p.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnSpeed)
    }
    if (keys.d) {
      p.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), -turnSpeed)
    }

    // Pitch
    if (keys.w) {
      const right = new THREE.Vector3().crossVectors(p.velocity, new THREE.Vector3(0, 1, 0)).normalize()
      p.velocity.applyAxisAngle(right, -turnSpeed * 0.7)
    }
    if (keys.s) {
      const right = new THREE.Vector3().crossVectors(p.velocity, new THREE.Vector3(0, 1, 0)).normalize()
      p.velocity.applyAxisAngle(right, turnSpeed * 0.7)
    }

    // Roll (visual only)
    if (keys.q) p.velocity.applyAxisAngle(p.velocity.clone().normalize(), turnSpeed)
    if (keys.e) p.velocity.applyAxisAngle(p.velocity.clone().normalize(), -turnSpeed)

    // Throttle
    const throttle = keys.shift ? p.speed * 2 : p.speed
    p.velocity.normalize().multiplyScalar(throttle)

    // Move
    p.position.add(p.velocity.clone().multiplyScalar(60 * dt))

    // Floor clamp
    if (p.position.y < 2) {
      p.position.y = 2
      p.velocity.y = Math.abs(p.velocity.y) * 0.5
    }

    // World bounds
    const bound = WORLD_SIZE * 0.9
    p.position.x = THREE.MathUtils.clamp(p.position.x, -bound, bound)
    p.position.z = THREE.MathUtils.clamp(p.position.z, -bound, bound)

    // Score over time
    p.score += dt * 2

    // Shooting
    shootCooldownRef.current -= dt
    if (keys.space && shootCooldownRef.current <= 0) {
      const baseCd = 0.15 * Math.max(0.05, 1 - 0.05 * weaponsLevel)
      shootCooldownRef.current = baseCd
      const id = projectileIdRef.current++
      let dir = p.velocity.clone().normalize()
      if (Math.random() < autoAimChance) {
        let best: { bot: Bot; dist: number } | null = null
        for (const b of botsRef.current) {
          if (!b.alive) continue
          const d = b.position.distanceTo(p.position)
          if (d < 60 && (!best || d < best.dist)) best = { bot: b, dist: d }
        }
        if (best) {
          dir = best.bot.position.clone().sub(p.position).normalize()
        }
      }
      setProjectiles((prev) => [
        ...prev,
        { id, pos: p.position.clone().add(dir.clone().multiplyScalar(3)), dir, life: 3 },
      ])
    }

    // Update projectiles
    setProjectiles((prev) =>
      prev
        .map((proj) => {
          proj.pos.add(proj.dir.clone().multiplyScalar(80 * dt))
          proj.life -= dt
          return proj
        })
        .filter((proj) => proj.life > 0)
    )

    // Projectile-bot collision
    setProjectiles((prev) => {
      const remaining = [...prev]
      for (let pi = remaining.length - 1; pi >= 0; pi--) {
        const proj = remaining[pi]
        for (const bot of botsRef.current) {
          if (!bot.alive) continue
          if (proj.pos.distanceTo(bot.position) < 4) {
            const base = hasSpeedBoost ? 30 : 20
            bot.health -= Math.floor(base * damageMultiplier)
            remaining.splice(pi, 1)
            if (bot.health <= 0) {
              bot.alive = false
              p.kills++
              const stolen = bot.score
              p.score += stolen
              // Steal bonuses
              for (const b of bot.bonuses) {
                if (b.expiresAt > now) {
                  p.bonuses.push({ type: b.type, expiresAt: b.expiresAt })
                }
              }
              onKill(bot.name, stolen)
            }
            break
          }
        }
      }
      return remaining
    })

    // Bonus collection
    setBonuses((prev) =>
      prev.map((b) => {
        if (b.collected && b.respawnAt < now) {
          return {
            ...b,
            collected: false,
            position: new THREE.Vector3(
              randomInRange(-WORLD_SIZE * 0.6, WORLD_SIZE * 0.6),
              randomInRange(10, CLOUD_HEIGHT + 20),
              randomInRange(-WORLD_SIZE * 0.6, WORLD_SIZE * 0.6)
            ),
          }
        }
        if (!b.collected && p.position.distanceTo(b.position) < 3) {
          p.bonuses.push({ type: b.type, expiresAt: now + 15000 })
          if (b.type === "heal") {
            p.health = Math.min(p.maxHealth, p.health + 30)
          }
          onBonusCollect(b.type)
          return { ...b, collected: true, respawnAt: now + 20000 }
        }
        return b
      })
    )

    // Obstacle collision
    for (const obs of obstacles) {
      if (p.position.distanceTo(obs.position) < Math.max(...obs.size) * 0.6) {
        const base = hasResistance ? 5 : 15
        const factor = Math.max(0.2, 1 - 0.05 * resistanceLevel)
        const damage = Math.floor(base * factor)
        p.health -= damage
        // Bounce away
        const away = p.position.clone().sub(obs.position).normalize()
        p.position.add(away.multiplyScalar(5))
      }
    }

    // Bot AI
    for (const bot of botsRef.current) {
      if (!bot.alive) continue
      // Simple chase/wander
      const distToPlayer = bot.position.distanceTo(p.position)
      if (distToPlayer < 100) {
        const toPlayer = p.position.clone().sub(bot.position).normalize()
        bot.direction.lerp(toPlayer, 0.02)
      } else {
        // Wander
        if (Math.random() < 0.01) {
          bot.direction.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5).normalize()
        }
      }
      bot.direction.normalize()
      bot.position.add(bot.direction.clone().multiplyScalar(15 * dt))
      bot.position.y = THREE.MathUtils.clamp(bot.position.y, 10, 80)
      bot.position.x = THREE.MathUtils.clamp(bot.position.x, -bound, bound)
      bot.position.z = THREE.MathUtils.clamp(bot.position.z, -bound, bound)

      // Bot attacks player
      if (distToPlayer < 30 && Math.random() < 0.01) {
        const base = hasResistance ? 3 : 8
        const factor = Math.max(0.2, 1 - 0.05 * resistanceLevel)
        const dmg = Math.floor(base * factor)
        p.health -= dmg
      }
    }

    // Check death
    if (p.health <= 0) {
      p.health = 0
      p.alive = false
      onDeath()
    }

    // Update state
    onScoreChange(Math.floor(p.score))
    onHealthChange(p.health)
    setPlayerState({ ...p })
    onStateUpdate({ ...p })
    setBots([...botsRef.current])
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 100, 50]} intensity={1.2} castShadow />
      <Sky sunPosition={[100, 50, 100]} turbidity={2} rayleigh={0.5} />
      <fog attach="fog" args={["#87CEEB", 200, WORLD_SIZE * 1.5]} />

      <Ground />
      <Runway />
      <Clouds />

      {bonuses.map((b) => (
        <BonusItem key={b.id} bonus={b} onCollect={() => {}} />
      ))}

      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} obstacle={o} />
      ))}

      {bots.map((bot) => (
        <BotAircraft key={bot.id} bot={bot} />
      ))}

      <PlayerAircraft playerRef={playerRef} state={playerState} parts={parts} />
      <Projectiles projectiles={projectiles} />
    </>
  )
}

// ====== HUD ======
function GameHUD({
  health,
  maxHealth,
  score,
  kills,
  bonuses,
  alive,
  onRestart,
  flygold,
}: {
  health: number
  maxHealth: number
  score: number
  kills: number
  bonuses: { type: BonusType; expiresAt: number }[]
  alive: boolean
  onRestart: () => void
  flygold: number
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(interval)
  }, [])

  const activeBonuses = bonuses.filter((b) => b.expiresAt > now)
  const bonusColors: Record<BonusType, string> = { speed: "bg-blue-500", resistance: "bg-amber-500", heal: "bg-emerald-500" }
  const bonusLabels: Record<BonusType, string> = { speed: "Velocidade", resistance: "Resistencia", heal: "Cura" }
  const calculatedFlygold = Math.floor(score / 10000)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <div className="space-y-2 pointer-events-auto">
          {/* Health */}
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border min-w-[200px]">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Vida</span>
              <span>{Math.round(health)}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  health > 60 ? "bg-emerald-500" : health > 30 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          {/* Active bonuses */}
          {activeBonuses.length > 0 && (
            <div className="bg-background/80 backdrop-blur-sm rounded-lg p-2 border border-border space-y-1">
              {activeBonuses.map((b, i) => {
                const remaining = Math.max(0, Math.ceil((b.expiresAt - now) / 1000))
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div className={`w-2 h-2 rounded-full ${bonusColors[b.type]}`} />
                    <span className="text-foreground">{bonusLabels[b.type]}</span>
                    <span className="text-muted-foreground ml-auto">{remaining}s</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Score & stats */}
        <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border text-right">
          <div className="text-2xl font-bold font-mono text-foreground tabular-nums">
            {Math.floor(score).toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">PONTOS</div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="text-foreground">
              <span className="text-muted-foreground">Kills: </span>
              <span className="font-bold">{kills}</span>
            </div>
            <div className="text-amber-400">
              <span className="text-muted-foreground">FlyGold: </span>
              <span className="font-bold">{calculatedFlygold}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Crosshair */}
      {alive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 border border-foreground/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-foreground/50 rounded-full" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-background/70 backdrop-blur-sm rounded-lg p-3 border border-border text-[10px] text-muted-foreground space-y-0.5 pointer-events-auto">
        <div><span className="font-mono text-foreground">WASD</span> - Direcionar</div>
        <div><span className="font-mono text-foreground">SHIFT</span> - Turbo</div>
        <div><span className="font-mono text-foreground">SPACE</span> - Atirar</div>
        <div><span className="font-mono text-foreground">Q/E</span> - Roll</div>
      </div>

      {/* Death screen */}
      {!alive && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-destructive">Destruido!</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Pontuacao Final: <span className="font-bold text-foreground">{Math.floor(score).toLocaleString()}</span></p>
              <p>Kills: <span className="font-bold text-foreground">{kills}</span></p>
              <p>FlyGold Ganho: <span className="font-bold text-amber-400">{calculatedFlygold}</span></p>
            </div>
            <button
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition"
              onClick={onRestart}
            >
              Jogar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== MAIN GAME PAGE ======
export default function GamePage() {
  const [health, setHealth] = useState(100)
  const [score, setScore] = useState(0)
  const [kills, setKills] = useState(0)
  const [alive, setAlive] = useState(true)
  const [bonuses, setBonuses] = useState<{ type: BonusType; expiresAt: number }[]>([])
  const [key, setKey] = useState(0)
  const [notifications, setNotifications] = useState<{ id: number; text: string; color: string }[]>([])
  const notifId = useRef(0)
  const flygold = Math.floor(score / 10000)
  const [selectedAircraft, setSelectedAircraft] = useState<{ speed?: number; health?: number; damage?: number; armor?: number } | undefined>(undefined)
  const [parts, setParts] = useState<AircraftPart[] | undefined>(undefined)
  const [color, setColor] = useState<string | undefined>(undefined)
  const [upgrades, setUpgrades] = useState<{ speed: number; weapons: number; resistance: number; autoaim: number } | undefined>(undefined)

  const addNotif = useCallback((text: string, color: string) => {
    const id = notifId.current++
    setNotifications((prev) => [...prev.slice(-4), { id, text, color }])
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3000)
  }, [])

  const restart = useCallback(() => {
    setKey((k) => k + 1)
    setHealth(100)
    setScore(0)
    setKills(0)
    setAlive(true)
    setBonuses([])
    setNotifications([])
  }, [])

  useEffect(() => {
    try {
      // Load stats
      const statsRaw = localStorage.getItem("selected_aircraft_stats")
      if (statsRaw) {
        const parsedStats = JSON.parse(statsRaw)
        setSelectedAircraft(parsedStats)
      }

      // Load parts
      const partsRaw = localStorage.getItem("selected_aircraft_parts")
      const colorRaw = localStorage.getItem("selected_aircraft_color")
      const upgradesRaw = localStorage.getItem("selected_aircraft_upgrades")
      if (colorRaw) setColor(colorRaw)
      if (upgradesRaw) {
        try {
          const u = JSON.parse(upgradesRaw)
          setUpgrades({
            speed: Number(u.speed) || 0,
            weapons: Number(u.weapons) || 0,
            resistance: Number(u.resistance) || 0,
            autoaim: Number(u.autoaim) || 0,
          })
        } catch {}
      }
      if (partsRaw) {
        const parsedParts = JSON.parse(partsRaw) as AircraftPart[]
        if (colorRaw) {
          const recolored = parsedParts.map((p) => ({ ...p, color: colorRaw }))
          setParts(recolored)
        } else {
          setParts(parsedParts)
        }
      }
    } catch (e) {
      console.error("Failed to load aircraft data from localStorage", e)
    }
  }, [])

  return (
    <div className="h-screen w-full relative bg-background">
      <Canvas key={key} camera={{ fov: 60 }} shadows>
        <GameScene
          onScoreChange={(v) => {
            setScore(v)
            try { setGuestPoints(Math.floor(v)) } catch {}
          }}
          onHealthChange={setHealth}
          onBonusCollect={(type) => addNotif(
            type === "speed" ? "Velocidade +!" : type === "heal" ? "Vida +30!" : "Resistencia +!",
            type === "speed" ? "text-blue-400" : type === "heal" ? "text-emerald-400" : "text-amber-400"
          )}
          onKill={(name, stolen) => {
            setKills((k) => k + 1)
            addNotif(`${name} destruido! +${stolen} pts roubados`, "text-red-400")
          }}
          onDeath={() => setAlive(false)}
          onStateUpdate={(state) => setBonuses([...state.bonuses])}
          selectedAircraft={selectedAircraft}
          parts={parts}
          upgrades={upgrades}
        />
      </Canvas>

      <GameHUD
        health={health}
        maxHealth={100}
        score={score}
        kills={kills}
        bonuses={bonuses}
        alive={alive}
        onRestart={restart}
        flygold={flygold}
      />

      {/* Kill/bonus notifications */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 space-y-1 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`text-sm font-bold text-center ${n.color} animate-in fade-in slide-in-from-top-2 duration-300`}
          >
            {n.text}
          </div>
        ))}
      </div>
    </div>
  )
}
