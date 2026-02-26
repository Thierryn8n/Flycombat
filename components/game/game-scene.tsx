"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import * as THREE from "three"
import { GameWorld, getTerrainHeight } from "./world"
import { PlayerController } from "./player-controller"
import { BonusPickups } from "./bonus-pickups"
import { Bullets } from "./bullets"
import { Missiles } from "./missiles"
import { AirMines } from "./air-mines"
import { Effects } from "./effects"
import type { Explosion } from "./effects"
import { EnemyBots, generateBots } from "./enemy-bots"
import { GameHUD } from "./hud"
import { GAME_CONFIG } from "@/lib/game/types"
import type { BonusType, ActiveBonus } from "@/lib/game/types"
import type { LocalPlayer, Bullet, BonusPickup, EnemyPlayer, KillFeedEntry, Missile, AirMine } from "@/lib/game/store"
import { playShootSound, playBonusSound, playImpactSound, playCrashSound, playExplosionSound, startEngineAmbient, stopEngineAmbient } from "@/lib/game/sounds"
import type { AircraftPart } from "@/lib/aircraft-database"
import { createClient } from "@/lib/supabase/client"

interface GameSceneProps {
  aircraftColor: string
  aircraftName: string
  baseSpeed: number
  baseHp: number
  baseHandling: number
  autoAimLevel: number
  onGameEnd: (points: number, kills: number) => void
  matchId?: string
  userId?: string
  displayName?: string
}

function generateBonuses(): BonusPickup[] {
  const bonuses: BonusPickup[] = []
  const types: BonusType[] = ["speed", "resistance", "heal", "missile", "missile", "emp", "mine"]
  for (let i = 0; i < 40; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const angle = Math.random() * Math.PI * 2
    const radius = 60 + Math.random() * 500
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    // Spawn bonuses at comfortable flying altitude above terrain
    const terrainH = getTerrainHeight(x, z)
    const y = terrainH + 10 + Math.random() * 40
    bonuses.push({ id: `bonus-${i}`, type, position: [x, y, z], collected: false })
  }
  return bonuses
}

export function GameScene({ aircraftColor, aircraftName, baseSpeed, baseHp, baseHandling, autoAimLevel, onGameEnd, matchId, userId, displayName }: GameSceneProps) {
  const [phase, setPhase] = useState<"waiting" | "countdown" | "active" | "finished">("waiting")
  const [countdown, setCountdown] = useState(3)
  const [matchTime, setMatchTime] = useState(GAME_CONFIG.MATCH_DURATION)
  const [stormRadius, setStormRadius] = useState(GAME_CONFIG.STORM_INITIAL_RADIUS)
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([])
  const totalKillsRef = useRef(0)

  const [player, setPlayer] = useState<LocalPlayer>({
    hp: baseHp,
    maxHp: baseHp,
    speed: baseSpeed,
    baseSpeed,
    handling: baseHandling,
    points: 0,
    alive: true,
    bonuses: [],
    position: [0, 5, -GAME_CONFIG.RUNWAY_LENGTH / 2 + 20],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    aircraftColor,
    aircraftName,
    missiles: 0,
    emps: 0,
    mines: 0,
    stunned: false,
    stunnedUntil: 0,
    invulnerable: false,
    invulnerableUntil: 0,
    respawnTimer: 0,
    deaths: 0,
    autoAimLevel,
  })

  const [bullets, setBullets] = useState<Bullet[]>([])
  const [missiles, setMissiles] = useState<Missile[]>([])
  const [airMines, setAirMines] = useState<AirMine[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const [bonuses, setBonuses] = useState<BonusPickup[]>(() => generateBonuses())
  const [enemies, setEnemies] = useState<EnemyPlayer[]>([])
  const [playerParts, setPlayerParts] = useState<AircraftPart[] | null>(null)
  const [botAircraftPool, setBotAircraftPool] = useState<Array<{ name: string; thumbnail_url?: string | null; category?: string | null }>>([])
  const botsInitializedRef = useRef(false)

  const playerRef = useRef(player)
  playerRef.current = player
  const enemiesRef = useRef(enemies)
  enemiesRef.current = enemies
  const stormRadiusRef = useRef(stormRadius)
  stormRadiusRef.current = stormRadius
  const mpRef = useRef<import("@/lib/game/multiplayer").MultiplayerManager | null>(null)
  const stormShrinkRate = (GAME_CONFIG.STORM_INITIAL_RADIUS - GAME_CONFIG.STORM_MIN_RADIUS) / GAME_CONFIG.MATCH_DURATION
  const playerAvatarUrlRef = useRef<string | undefined>(undefined)
  const playerAvatarIconRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    try {
      const avatarUrl = localStorage.getItem("selected_avatar_url") || undefined
      const avatarIcon = localStorage.getItem("selected_avatar_icon") || "👤"
      playerAvatarUrlRef.current = avatarUrl
      playerAvatarIconRef.current = avatarIcon
      setPlayer((p) => ({ ...p, displayName: displayName || "Voce", avatarUrl, avatarIcon }))
    } catch {
      setPlayer((p) => ({ ...p, displayName: displayName || "Voce", avatarIcon: "👤" }))
    }
  }, [displayName])

  useEffect(() => {
    let active = true
    async function loadAircraftPool() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("aircraft")
          .select("name, thumbnail_url, category")
          .eq("is_published", true)
        if (active && data) {
          setBotAircraftPool(data as any)
        }
      } catch {}
    }
    loadAircraftPool()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (botsInitializedRef.current) return
    if (matchId && userId && displayName) {
      const timer = setTimeout(() => {
        const hasHuman = enemiesRef.current.some((e) => !e.id.startsWith("bot-"))
        if (!hasHuman) {
          setEnemies(generateBots(7, botAircraftPool))
          botsInitializedRef.current = true
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
    setEnemies(generateBots(7, botAircraftPool))
    botsInitializedRef.current = true
  }, [matchId, userId, displayName, botAircraftPool])

  // Multiplayer: join channel and broadcast state
  useEffect(() => {
    if (!matchId || !userId || !displayName) return

    let mp: import("@/lib/game/multiplayer").MultiplayerManager | null = null

    async function initMultiplayer() {
      const { MultiplayerManager } = await import("@/lib/game/multiplayer")
      mp = new MultiplayerManager(userId!, displayName!, matchId!, {
        onPlayerJoin: (p) => {
          setEnemies((prev) => {
            if (prev.find((e) => e.id === p.userId)) return prev
            return [...prev, {
              id: p.userId,
              displayName: p.displayName,
              position: p.position,
              rotation: p.rotation,
              hp: p.hp,
              maxHp: p.maxHp,
              alive: p.alive,
              aircraftColor: p.aircraftColor,
              points: p.points,
              bonuses: p.bonuses,
              avatarUrl: p.avatarUrl,
              avatarIcon: p.avatarIcon,
              aircraftName: p.aircraftName,
              aircraftImage: p.aircraftImage,
            }]
          })
        },
        onPlayerLeave: (uid) => {
          setEnemies((prev) => prev.filter((e) => e.id !== uid))
        },
        onPlayerUpdate: (p) => {
          setEnemies((prev) =>
            prev.map((e) =>
              e.id === p.userId
                ? { ...e, position: p.position, rotation: p.rotation, hp: p.hp, alive: p.alive, points: p.points, bonuses: p.bonuses, avatarUrl: p.avatarUrl, avatarIcon: p.avatarIcon, aircraftName: p.aircraftName, aircraftImage: p.aircraftImage }
                : e
            )
          )
        },
        onPlayerShoot: (bullet) => {
          setBullets((prev) => [...prev, {
            id: bullet.id,
            position: bullet.position,
            direction: bullet.direction,
            ownerId: bullet.ownerId,
            createdAt: Date.now(),
          }])
        },
        onPlayerKill: (kill) => {
          setKillFeed((kf) => [...kf, { killer: kill.killerName, victim: kill.victimName, timestamp: Date.now() }].slice(-5))
        },
      })
      await mp.join()
      mpRef.current = mp

      // Start broadcasting local state
      mp.startBroadcasting(() => ({
        userId: userId!,
        displayName: displayName!,
        position: playerRef.current.position,
        rotation: playerRef.current.rotation,
        hp: playerRef.current.hp,
        maxHp: playerRef.current.maxHp,
        alive: playerRef.current.alive,
        aircraftColor: playerRef.current.aircraftColor,
        aircraftName: playerRef.current.aircraftName,
        avatarUrl: playerAvatarUrlRef.current,
        avatarIcon: playerAvatarIconRef.current,
        points: playerRef.current.points,
        bonuses: playerRef.current.bonuses,
      }))
    }

    initMultiplayer()
    return () => {
      mp?.leave()
    }
  }, [matchId, userId, displayName])

  // Engine ambient sound
  useEffect(() => {
    startEngineAmbient()
    return () => stopEngineAmbient()
  }, [])

  // Load selected aircraft parts
  useEffect(() => {
    try {
      const partsRaw = localStorage.getItem("selected_aircraft_parts")
      const colorRaw = localStorage.getItem("selected_aircraft_color")
      const colorsByTypeRaw = localStorage.getItem("selected_aircraft_colors")
      if (partsRaw) {
        const parsed = JSON.parse(partsRaw) as AircraftPart[]
        const arr = Array.isArray(parsed) ? parsed : []
        const colorsByType = colorsByTypeRaw ? JSON.parse(colorsByTypeRaw) as Record<string, string> : {}
        const groups: Record<string, string[]> = {
          fuselage: ["fuselage", "engine", "missile", "fuel_tank"],
          wing: ["wing", "leading_edge", "flap", "aileron", "lerx", "canard", "tail_h"],
          tail: ["tail_v"],
          intake: ["intake", "ramp"],
          nozzle: ["nozzle", "afterburner"],
          canopy: ["canopy", "cockpit", "hud"],
        }
        const colored = arr.map(p => {
          const t = (p.type || "").toLowerCase()
          const isGlass = t === "canopy" || t === "cockpit" || t === "hud"
          let override: string | undefined = undefined
          for (const [k, types] of Object.entries(groups)) {
            if (types.includes(t) && colorsByType[k]) {
              override = colorsByType[k]
              break
            }
          }
          if (override) return { ...p, color: override }
          if (colorRaw && !isGlass) return { ...p, color: colorRaw }
          return { ...p }
        })
        setPlayerParts(colored)
      }
    } catch {}
  }, [])

  // Start sequence
  useEffect(() => {
    const timer = setTimeout(() => setPhase("countdown"), 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== "countdown") return
    if (countdown <= 0) {
      setPhase("active")
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown])

  // Match timer + storm + survival points + bonus expiry + storm damage + stun check
  useEffect(() => {
    if (phase !== "active") return
    const interval = setInterval(() => {
      setMatchTime((t) => {
        if (t <= 1) {
          setPhase("finished")
          return 0
        }
        return t - 1
      })

      setStormRadius((r) => Math.max(GAME_CONFIG.STORM_MIN_RADIUS, r - stormShrinkRate))

      setPlayer((p) => {
        if (!p.alive) return p

        let newPoints = p.points + GAME_CONFIG.POINTS_PER_SECOND_ALIVE
        let newHp = p.hp
        let newSpeed = p.baseSpeed
        let newBonuses = p.bonuses
          .map((b) => ({ ...b, remainingMs: b.expiresAt - Date.now() }))
          .filter((b) => b.remainingMs > 0)

        const hasSpeed = newBonuses.some((b) => b.type === "speed")
        if (hasSpeed) newSpeed = p.baseSpeed * GAME_CONFIG.BONUS_SPEED_MULT
        const hasResist = newBonuses.some((b) => b.type === "resistance")

        // Invulnerability expiry
        let invulnerable = p.invulnerable
        let invulnerableUntil = p.invulnerableUntil
        if (invulnerable && Date.now() > invulnerableUntil) {
          invulnerable = false
          invulnerableUntil = 0
        }

        // Stun expiry
        let stunned = p.stunned
        let stunnedUntil = p.stunnedUntil
        if (stunned && Date.now() > stunnedUntil) {
          stunned = false
          stunnedUntil = 0
        }

        // Storm damage - use stormRadiusRef to avoid dependency
        const dist = Math.sqrt(p.position[0] ** 2 + p.position[2] ** 2)
        if (dist > stormRadiusRef.current && !invulnerable) {
          const dmg = hasResist ? GAME_CONFIG.STORM_DAMAGE * GAME_CONFIG.BONUS_RESIST_MULT : GAME_CONFIG.STORM_DAMAGE
          newHp = Math.max(0, newHp - dmg)
        }

        if (newHp <= 0 && p.alive) {
          return {
            ...p,
            hp: 0,
            alive: false,
            points: newPoints,
            speed: newSpeed,
            bonuses: newBonuses,
            respawnTimer: 0,
            deaths: p.deaths + 1,
            stunned: false,
            stunnedUntil: 0,
            invulnerable: false,
            invulnerableUntil: 0,
          }
        }

        return { ...p, points: newPoints, hp: newHp, speed: newSpeed, bonuses: newBonuses, stunned, stunnedUntil, invulnerable, invulnerableUntil }
      })

      const aliveCount = (playerRef.current.alive ? 1 : 0) + enemiesRef.current.filter((e) => e.alive).length
      if (aliveCount <= 1) setPhase("finished")
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    try {
      localStorage.setItem("current_match_points", String(Math.floor(player.points)))
      localStorage.setItem("current_match_kills", String(Math.floor(totalKillsRef.current)))
    } catch {}
  }, [player.points])

  // Bullet collision - uses refs to avoid recreating interval
  useEffect(() => {
    if (phase !== "active") return
    const interval = setInterval(() => {
      setBullets((prevBullets) => {
        const remaining: Bullet[] = []
        const hitEnemyIds = new Set<string>()
        const hitPlayer = { hit: false }
        const currentEnemies = enemiesRef.current
        const currentPlayer = playerRef.current

        for (const bullet of prevBullets) {
          if (Date.now() - bullet.createdAt > 3000) continue
          let consumed = false

          if (bullet.ownerId === "player") {
            for (const enemy of currentEnemies) {
              if (!enemy.alive) continue
              const dx = bullet.position[0] - enemy.position[0]
              const dy = bullet.position[1] - enemy.position[1]
              const dz = bullet.position[2] - enemy.position[2]
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
              if (dist < 8) {
                hitEnemyIds.add(enemy.id)
                consumed = true
                addExplosion(bullet.position, "bullet")
                break
              }
            }
          }

          if (bullet.ownerId !== "player" && currentPlayer.alive && !currentPlayer.invulnerable) {
            const dx = bullet.position[0] - currentPlayer.position[0]
            const dy = bullet.position[1] - currentPlayer.position[1]
            const dz = bullet.position[2] - currentPlayer.position[2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
            if (dist < 8) {
              hitPlayer.hit = true
              consumed = true
            }
          }

          if (!consumed) remaining.push(bullet)
        }

        if (hitEnemyIds.size > 0) {
          setEnemies((prev) =>
            prev.map((e) => {
              if (!hitEnemyIds.has(e.id)) return e
              const hasResist = e.bonuses.some((b) => b.type === "resistance" && b.expiresAt > Date.now())
              const dmg = hasResist ? GAME_CONFIG.BULLET_DAMAGE * GAME_CONFIG.BONUS_RESIST_MULT : GAME_CONFIG.BULLET_DAMAGE
              const newHp = Math.max(0, e.hp - dmg)
              if (newHp <= 0 && e.alive) {
                totalKillsRef.current += 1
                const stolenPoints = Math.floor(e.points * 0.5)
                const stolenBonuses = e.bonuses
                  .filter((b) => b.expiresAt > Date.now())
                  .map((b) => ({ ...b, remainingMs: b.expiresAt - Date.now() }))

                setPlayer((p) => ({
                  ...p,
                  points: p.points + GAME_CONFIG.POINTS_PER_KILL + stolenPoints,
                  bonuses: [...p.bonuses, ...stolenBonuses.map((b) => ({ ...b, expiresAt: Date.now() + b.remainingMs }))],
                }))

                setKillFeed((kf) => {
                  const newFeed = [...kf, { killer: "Voce", victim: e.displayName, timestamp: Date.now() }]
                  return newFeed.slice(-5)
                })

                return { ...e, hp: 0, alive: false }
              }
              return { ...e, hp: newHp }
            })
          )
        }

        if (hitPlayer.hit) {
          setPlayer((p) => {
            if (!p.alive || p.invulnerable) return p
            const hasResist = p.bonuses.some((b) => b.type === "resistance" && b.expiresAt > Date.now())
            const dmg = hasResist ? GAME_CONFIG.BULLET_DAMAGE * GAME_CONFIG.BONUS_RESIST_MULT : GAME_CONFIG.BULLET_DAMAGE
            const newHp = Math.max(0, p.hp - dmg)
            if (newHp <= 0) {
              return {
                ...p,
                hp: 0,
                alive: false,
                respawnTimer: 0,
                deaths: p.deaths + 1,
              }
            }
            return { ...p, hp: newHp }
          })
        }

        return remaining
      })
    }, 100)
    return () => clearInterval(interval)
  }, [phase])

  function addExplosion(position: [number, number, number], type: "bullet" | "missile" | "mine" | "emp") {
    setExplosions((prev) => [
      ...prev,
      { id: `exp-${Date.now()}-${Math.random()}`, position, createdAt: Date.now(), type },
    ])
    if (type !== "bullet") playExplosionSound()
  }

  const handleTerrainCollision = useCallback(() => {
    playImpactSound()
    setPlayer((p) => {
      if (!p.alive || p.invulnerable) return p
      const dmg = 15
      const newHp = Math.max(0, p.hp - dmg)
      if (newHp <= 0) {
        return { ...p, hp: 0, alive: false, respawnTimer: 0, deaths: p.deaths + 1 }
      }
      return { ...p, hp: newHp }
    })
  }, [])

  const handleCrash = useCallback((position: [number, number, number]) => {
    addExplosion(position, "missile")
    playCrashSound()
    setPlayer((p) => {
      if (!p.alive || p.invulnerable) return p
      return { ...p, hp: 0, alive: false, respawnTimer: 0, deaths: p.deaths + 1 }
    })
  }, [])

  const handlePlayerUpdate = useCallback((position: [number, number, number], rotation: [number, number, number]) => {
    setPlayer((p) => ({ ...p, position, rotation }))
  }, [])

  const handlePlayerShoot = useCallback(() => {
    const p = playerRef.current
    if (!p.alive || p.stunned) return
    const euler = new THREE.Euler(p.rotation[0], p.rotation[1], p.rotation[2], "YXZ")
    const quat = new THREE.Quaternion().setFromEuler(euler)
    let dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)

    // Auto-aim tracking: chance baseada no nível de autoaim
    const baseAim = 0.2 + 0.05 * p.autoAimLevel
    const autoAimChance = Math.min(1, 0.2 + 0.05 * p.autoAimLevel)
    const currentEnemies = enemiesRef.current
    let best: { enemy: EnemyPlayer; dist: number; angle: number } | null = null
    for (const e of currentEnemies) {
      if (!e.alive) continue
      const toEnemy = new THREE.Vector3(...e.position).sub(new THREE.Vector3(...p.position))
      const dist = toEnemy.length()
      if (dist > GAME_CONFIG.MISSILE_LOCK_RANGE) continue
      const angle = dir.angleTo(toEnemy.normalize())
      if (angle > Math.PI / 3) continue // 60°
      if (!best || dist < best.dist) best = { enemy: e, dist, angle }
    }
    if (best && Math.random() < autoAimChance) {
      const targetDir = new THREE.Vector3(...best.enemy.position).sub(new THREE.Vector3(...p.position)).normalize()
      dir = dir.lerp(targetDir, Math.min(0.8, baseAim))
      dir.normalize()
    }

    const bullet: Bullet = {
      id: `bullet-${Date.now()}-${Math.random()}`,
      position: [p.position[0] + dir.x * 5, p.position[1] + dir.y * 5, p.position[2] + dir.z * 5],
      direction: [dir.x, dir.y, dir.z],
      ownerId: "player",
      createdAt: Date.now(),
    }
    setBullets((prev) => [...prev, bullet])
    playShootSound()
  }, [])

  const handleFireMissile = useCallback(() => {
    const p = playerRef.current
    if (!p.alive || p.stunned || p.missiles <= 0) return
    // Find nearest enemy using ref
    const currentEnemies = enemiesRef.current
    let nearestEnemy: EnemyPlayer | null = null
    let nearestDist = GAME_CONFIG.MISSILE_LOCK_RANGE
    for (const e of currentEnemies) {
      if (!e.alive) continue
      const dx = e.position[0] - p.position[0]
      const dy = e.position[1] - p.position[1]
      const dz = e.position[2] - p.position[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestEnemy = e
      }
    }
    if (!nearestEnemy) return

    const euler = new THREE.Euler(p.rotation[0], p.rotation[1], p.rotation[2], "YXZ")
    const quat = new THREE.Quaternion().setFromEuler(euler)
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)

    const missile: Missile = {
      id: `missile-${Date.now()}-${Math.random()}`,
      position: [p.position[0] + dir.x * 5, p.position[1] + dir.y * 5, p.position[2] + dir.z * 5],
      direction: [dir.x, dir.y, dir.z],
      ownerId: "player",
      targetId: nearestEnemy.id,
      createdAt: Date.now(),
    }
    setMissiles((prev) => [...prev, missile])
    setPlayer((prev) => ({ ...prev, missiles: prev.missiles - 1 }))
  }, [])

  const handleFireEMP = useCallback(() => {
    const p = playerRef.current
    if (!p.alive || p.stunned || p.emps <= 0) return
    addExplosion(p.position, "emp")
    // Stun all enemies in radius
    setEnemies((prev) =>
      prev.map((e) => {
        if (!e.alive) return e
        const dx = e.position[0] - p.position[0]
        const dy = e.position[1] - p.position[1]
        const dz = e.position[2] - p.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < GAME_CONFIG.EMP_RADIUS) {
          const newHp = Math.max(0, e.hp - GAME_CONFIG.EMP_DAMAGE)
          return { ...e, hp: newHp, alive: newHp > 0 }
        }
        return e
      })
    )
    setPlayer((prev) => ({ ...prev, emps: prev.emps - 1 }))
  }, [])

  const handleDeployMine = useCallback(() => {
    const p = playerRef.current
    if (!p.alive || p.stunned || p.mines <= 0) return
    const mine: AirMine = {
      id: `mine-${Date.now()}-${Math.random()}`,
      position: [...p.position] as [number, number, number],
      ownerId: "player",
      createdAt: Date.now(),
    }
    setAirMines((prev) => [...prev, mine])
    setPlayer((prev) => ({ ...prev, mines: prev.mines - 1 }))
  }, [])

  const handleMissileHit = useCallback((missileId: string, targetId: string) => {
    setMissiles((prev) => {
      const missile = prev.find((m) => m.id === missileId)
      if (missile) addExplosion(missile.position, "missile")
      return prev.filter((m) => m.id !== missileId)
    })

    if (targetId === "player") {
      setPlayer((p) => {
        if (!p.alive || p.invulnerable) return p
        const hasResist = p.bonuses.some((b) => b.type === "resistance" && b.expiresAt > Date.now())
        const dmg = hasResist ? GAME_CONFIG.MISSILE_DAMAGE * GAME_CONFIG.BONUS_RESIST_MULT : GAME_CONFIG.MISSILE_DAMAGE
        const newHp = Math.max(0, p.hp - dmg)
        if (newHp <= 0) {
          return { ...p, hp: 0, alive: false, respawnTimer: 0, deaths: p.deaths + 1 }
        }
        return { ...p, hp: newHp }
      })
    } else {
      setEnemies((prev) =>
        prev.map((e) => {
          if (e.id !== targetId) return e
          const hasResist = e.bonuses.some((b) => b.type === "resistance" && b.expiresAt > Date.now())
          const dmg = hasResist ? GAME_CONFIG.MISSILE_DAMAGE * GAME_CONFIG.BONUS_RESIST_MULT : GAME_CONFIG.MISSILE_DAMAGE
          const newHp = Math.max(0, e.hp - dmg)
          if (newHp <= 0 && e.alive) {
            totalKillsRef.current += 1
            setPlayer((p) => ({ ...p, points: p.points + GAME_CONFIG.POINTS_PER_KILL }))
            setKillFeed((kf) => [...kf, { killer: "Voce", victim: e.displayName, timestamp: Date.now() }].slice(-5))
            return { ...e, hp: 0, alive: false }
          }
          return { ...e, hp: newHp }
        })
      )
    }
  }, [])

  const handleMineTriggered = useCallback((mineId: string, targetId: string) => {
    setAirMines((prev) => {
      const mine = prev.find((m) => m.id === mineId)
      if (mine) addExplosion(mine.position, "mine")
      return prev.filter((m) => m.id !== mineId)
    })

    if (targetId === "player") {
      setPlayer((p) => {
        if (!p.alive || p.invulnerable) return p
        const newHp = Math.max(0, p.hp - GAME_CONFIG.MINE_DAMAGE)
        if (newHp <= 0) {
          return { ...p, hp: 0, alive: false, respawnTimer: 0, deaths: p.deaths + 1 }
        }
        return { ...p, hp: newHp }
      })
    } else {
      setEnemies((prev) =>
        prev.map((e) => {
          if (e.id !== targetId) return e
          const newHp = Math.max(0, e.hp - GAME_CONFIG.MINE_DAMAGE)
          if (newHp <= 0 && e.alive) {
            totalKillsRef.current += 1
            setPlayer((p) => ({ ...p, points: p.points + GAME_CONFIG.POINTS_PER_KILL }))
            setKillFeed((kf) => [...kf, { killer: "Voce", victim: e.displayName, timestamp: Date.now() }].slice(-5))
            return { ...e, hp: 0, alive: false }
          }
          return { ...e, hp: newHp }
        })
      )
    }
  }, [])

  const handleEnemyShoot = useCallback((enemyId: string, pos: [number, number, number], dir: [number, number, number]) => {
    const bullet: Bullet = {
      id: `ebullet-${Date.now()}-${Math.random()}`,
      position: [pos[0] + dir[0] * 4, pos[1] + dir[1] * 4, pos[2] + dir[2] * 4],
      direction: dir,
      ownerId: enemyId,
      createdAt: Date.now(),
    }
    setBullets((prev) => [...prev, bullet])
  }, [])

  const handleBonusCollect = useCallback((id: string) => {
    playBonusSound()
    setBonuses((prev) => {
      const bonus = prev.find((b) => b.id === id)
      if (!bonus || bonus.collected) return prev
      const updated = prev.map((b) => (b.id === id ? { ...b, collected: true } : b))

      setPlayer((p) => {
        if (!p.alive) return p
        let newPlayer = { ...p, points: p.points + GAME_CONFIG.POINTS_PER_BONUS }

        if (bonus.type === "heal") {
          newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + GAME_CONFIG.BONUS_HEAL_AMOUNT)
        } else if (bonus.type === "missile") {
          newPlayer.missiles = newPlayer.missiles + 2
        } else if (bonus.type === "emp") {
          newPlayer.emps = newPlayer.emps + 1
        } else if (bonus.type === "mine") {
          newPlayer.mines = newPlayer.mines + 3
        } else {
          const duration = bonus.type === "speed" ? GAME_CONFIG.BONUS_SPEED_DURATION : GAME_CONFIG.BONUS_RESIST_DURATION
          const newBonus: ActiveBonus = {
            type: bonus.type,
            expiresAt: Date.now() + duration,
            remainingMs: duration,
          }
          newPlayer.bonuses = [...newPlayer.bonuses, newBonus]
          if (bonus.type === "speed") {
            newPlayer.speed = newPlayer.baseSpeed * GAME_CONFIG.BONUS_SPEED_MULT
          }
        }
        return newPlayer
      })

      return updated
    })
  }, [])

  const handleBulletExpired = useCallback((id: string) => {
    setBullets((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const handleMissileExpired = useCallback((id: string) => {
    setMissiles((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const handleMineExpired = useCallback((id: string) => {
    setAirMines((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const handleExplosionDone = useCallback((id: string) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleLeave = useCallback(() => {
    onGameEnd(player.points, totalKillsRef.current)
  }, [player.points, onGameEnd])

  // Weapon key listeners (1, 2, 3)
  useEffect(() => {
    function handleWeapon(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail === "missile") handleFireMissile()
      else if (detail === "emp") handleFireEMP()
      else if (detail === "mine") handleDeployMine()
    }
    window.addEventListener("flygold-weapon", handleWeapon)
    return () => window.removeEventListener("flygold-weapon", handleWeapon)
  }, [handleFireMissile, handleFireEMP, handleDeployMine])

  // On phase finished
  useEffect(() => {
    if (phase === "finished") {
      try {
        localStorage.setItem("last_match_points", String(Math.floor(player.points)))
        localStorage.setItem("last_match_kills", String(Math.floor(totalKillsRef.current)))
      } catch {}
      const timer = setTimeout(() => {
        onGameEnd(player.points, totalKillsRef.current)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [phase, player.points, onGameEnd])

  const playersAlive = enemies.filter((e) => e.alive).length + (player.alive ? 1 : 0)

  return (
    <div className="relative w-full h-screen">
      <GameHUD
        player={player}
        phase={phase}
        countdown={countdown}
        matchTime={matchTime}
        playersAlive={playersAlive}
        killFeed={killFeed}
        onLeave={handleLeave}
        onFireMissile={handleFireMissile}
        onFireEMP={handleFireEMP}
        onDeployMine={handleDeployMine}
        enemies={enemies}
      />
      <Canvas
        shadows={false}
        camera={{ fov: 65, near: 0.1, far: 1500, position: [0, 20, 30] }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        frameloop="always"
        dpr={[1, 1]}
      >
        <GameWorld stormRadius={stormRadius} />
        {/* Always show the player airplane (on runway during waiting/countdown, flying during active) */}
        {player.alive && (
          <group>
            {player.invulnerable && (
              <mesh position={player.position}>
                <sphereGeometry args={[4, 12, 12]} />
                <meshBasicMaterial color="#00ccff" transparent opacity={0.15} wireframe />
              </mesh>
            )}
            <PlayerController
              player={player}
              onUpdate={handlePlayerUpdate}
              onShoot={handlePlayerShoot}
              onTerrainCollision={handleTerrainCollision}
              onCrash={handleCrash}
              phase={phase}
              parts={playerParts ?? undefined}
            />
          </group>
        )}
        {/* Active-phase only content */}
        {phase === "active" && (
          <>
            <BonusPickups
              bonuses={bonuses}
              playerPosition={player.position}
              onCollect={handleBonusCollect}
            />
            <Bullets bullets={bullets} onBulletExpired={handleBulletExpired} />
            <Missiles
              missiles={missiles}
              enemies={enemies}
              playerPosition={player.position}
              onMissileHit={handleMissileHit}
              onMissileExpired={handleMissileExpired}
            />
            <AirMines
              mines={airMines}
              enemies={enemies}
              playerPosition={player.position}
              playerId="player"
              onMineTriggered={handleMineTriggered}
              onMineExpired={handleMineExpired}
            />
            <Effects explosions={explosions} onExplosionDone={handleExplosionDone} />
            <EnemyBots
              enemies={enemies}
              playerPosition={player.position}
              onEnemyShoot={handleEnemyShoot}
            />
          </>
        )}
      </Canvas>
    </div>
  )
}
