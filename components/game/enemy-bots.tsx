"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import { AirplaneModel } from "./airplane"
import { GAME_CONFIG } from "@/lib/game/types"
import { getTerrainHeight } from "./world"
import type { EnemyPlayer } from "@/lib/game/store"

interface EnemyBotsProps {
  enemies: EnemyPlayer[]
  playerPosition: [number, number, number]
  onEnemyShoot: (enemyId: string, pos: [number, number, number], dir: [number, number, number]) => void
}

const BOT_NAMES = ["Ace", "Viper", "Ghost", "Hawk", "Storm", "Blaze", "Fang", "Bolt", "Rex"]
const BOT_COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1"]

const CATEGORY_COLORS: Record<string, string> = {
  fighter: "#3B82F6",
  bomber: "#EF4444",
  attack: "#F59E0B",
  helicopter: "#22C55E",
  transport: "#14B8A6",
  drone: "#8B5CF6",
}

export function generateBots(count: number, pool?: { name: string; thumbnail_url?: string | null; category?: string | null }[]): EnemyPlayer[] {
  const bots: EnemyPlayer[] = []
  for (let i = 0; i < count; i++) {
    const ac = pool && pool.length > 0 ? pool[i % pool.length] : null
    const angle = (i / count) * Math.PI * 2
    const dist = 200 + Math.random() * 400
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    const terrainH = getTerrainHeight(x, z)
    const acColor = ac?.category ? (CATEGORY_COLORS[ac.category] || BOT_COLORS[i % BOT_COLORS.length]) : BOT_COLORS[i % BOT_COLORS.length]
    bots.push({
      id: `bot-${i}`,
      displayName: ac?.name ? ac.name : BOT_NAMES[i % BOT_NAMES.length],
      position: [x, Math.max(terrainH + 15, 30 + Math.random() * 50), z],
      rotation: [0, angle + Math.PI, 0],
      hp: 60 + Math.floor(Math.random() * 40),
      maxHp: 80,
      alive: true,
      aircraftColor: acColor,
      points: Math.floor(Math.random() * 2000),
      bonuses: [],
      aircraftName: ac?.name,
      aircraftImage: ac?.thumbnail_url || undefined,
      avatarUrl: ac?.thumbnail_url || undefined,
      avatarIcon: ac?.thumbnail_url ? undefined : "✈️",
    })
  }
  return bots
}

export function EnemyBots({ enemies, playerPosition, onEnemyShoot }: EnemyBotsProps) {
  return (
    <>
      {enemies
        .filter((e) => e.alive)
        .map((enemy) => (
          <EnemyBot
            key={enemy.id}
            enemy={enemy}
            playerPosition={playerPosition}
            onShoot={onEnemyShoot}
          />
        ))}
    </>
  )
}

function EnemyBot({
  enemy,
  playerPosition,
  onShoot,
}: {
  enemy: EnemyPlayer
  playerPosition: [number, number, number]
  onShoot: (enemyId: string, pos: [number, number, number], dir: [number, number, number]) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef({
    yaw: enemy.rotation[1],
    pitch: 0,
    roll: 0,
    targetYaw: 0,
    targetPitch: 0,
    targetAlt: 40 + Math.random() * 40,
    speed: 32 + Math.random() * 12,
    targetSpeed: 38 + Math.random() * 12,
    changeTimer: Math.random() * 3,
    shootTimer: 2 + Math.random() * 3,
    mode: "wander" as "wander" | "chase" | "evade",
  })

  useFrame((_, delta) => {
    if (!groupRef.current || !enemy.alive) return
    const dt = Math.min(delta, 0.05)
    const state = stateRef.current
    const pos = groupRef.current.position

    // Distance to player
    const dx = playerPosition[0] - pos.x
    const dy = playerPosition[1] - pos.y
    const dz = playerPosition[2] - pos.z
    const distToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const terrainH = getTerrainHeight(pos.x, pos.z)

    // AI behavior
    state.changeTimer -= dt
    if (state.changeTimer <= 0) {
      state.changeTimer = 3 + Math.random() * 5

      if (distToPlayer < 150) {
        state.mode = Math.random() > 0.3 ? "chase" : "evade"
      } else if (distToPlayer < 400) {
        state.mode = Math.random() > 0.5 ? "chase" : "wander"
      } else {
        state.mode = "wander"
      }

      state.targetAlt = terrainH + 18 + Math.random() * 50

      if (state.mode === "wander") {
        state.targetYaw = state.yaw + (Math.random() - 0.5) * 1.2
        state.targetPitch = (Math.random() - 0.5) * 0.2
        state.targetSpeed = 32 + Math.random() * 10
      }
    }

    if (state.mode === "chase") {
      state.targetYaw = Math.atan2(-dx, -dz)
      state.targetPitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 0.25
      state.targetSpeed = distToPlayer > 200 ? 48 : 40
    } else if (state.mode === "evade") {
      state.targetYaw = Math.atan2(dx, dz)
      state.targetPitch = 0.1
      state.targetSpeed = 44
    }

    // Smooth rotation
    let yawDiff = state.targetYaw - state.yaw
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    const yawRate = 0.9
    state.yaw += THREE.MathUtils.clamp(yawDiff, -yawRate * dt, yawRate * dt)
    const altErr = state.targetAlt - pos.y
    const altPitch = THREE.MathUtils.clamp(altErr * 0.004, -0.15, 0.15)
    const pitchTarget = THREE.MathUtils.clamp(state.targetPitch + altPitch, -0.3, 0.3)
    state.pitch = THREE.MathUtils.lerp(state.pitch, pitchTarget, 1.6 * dt)
    state.roll = THREE.MathUtils.lerp(state.roll, THREE.MathUtils.clamp(-yawDiff * 0.7, -0.6, 0.6), 2.2 * dt)
    state.speed = THREE.MathUtils.lerp(state.speed, state.targetSpeed, 0.6 * dt)

    // Movement
    const forward = new THREE.Vector3(
      -Math.sin(state.yaw) * Math.cos(state.pitch),
      Math.sin(state.pitch),
      -Math.cos(state.yaw) * Math.cos(state.pitch)
    )

    pos.x += forward.x * state.speed * dt
    pos.y += forward.y * state.speed * dt
    pos.z += forward.z * state.speed * dt

    const minBotClearance = 12

    if (pos.y < terrainH + minBotClearance) {
      pos.y = terrainH + minBotClearance
      state.pitch = Math.max(state.pitch, 0.15)
    }

    // Altitude clamp
    pos.y = THREE.MathUtils.clamp(pos.y, terrainH + minBotClearance, GAME_CONFIG.MAX_ALTITUDE - 30)

    // World bounds
    const maxDist = GAME_CONFIG.WORLD_SIZE * 0.4
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
    if (dist > maxDist) {
      state.targetYaw = Math.atan2(-pos.x, -pos.z)
      state.targetAlt = terrainH + 25
    }

    // Apply rotation
    groupRef.current.rotation.set(state.pitch, state.yaw, state.roll)

    // Update enemy data
    enemy.position = [pos.x, pos.y, pos.z]
    enemy.rotation = [state.pitch, state.yaw, state.roll]

    // Shooting at player
    state.shootTimer -= dt
    if (state.shootTimer <= 0 && distToPlayer < 200 && state.mode === "chase") {
      state.shootTimer = 1.5 + Math.random() * 2
      const shootDir = new THREE.Vector3(dx, dy, dz).normalize()
      onShoot(
        enemy.id,
        [pos.x, pos.y, pos.z],
        [shootDir.x, shootDir.y, shootDir.z]
      )
    }
  })

  return (
    <group ref={groupRef} position={enemy.position}>
      <AirplaneModel color={enemy.aircraftColor} />
      <Html position={[0, 3.2, 0]} center distanceFactor={12}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(10,12,18,0.7)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 6px", borderRadius: 6, color: "#e2e8f0", fontSize: 10, whiteSpace: "nowrap" }}>
          {enemy.avatarUrl ? (
            <img src={enemy.avatarUrl} alt={enemy.displayName} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 20, height: 20, borderRadius: 4, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
              {enemy.avatarIcon || "👤"}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 700 }}>{enemy.displayName}</span>
            <span style={{ color: "#94a3b8" }}>{enemy.aircraftName || "BOT"}</span>
          </div>
        </div>
      </Html>
    </group>
  )
}
