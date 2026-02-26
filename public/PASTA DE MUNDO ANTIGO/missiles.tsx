"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { GAME_CONFIG } from "@/lib/game/types"
import type { Missile } from "@/lib/game/store"
import type { EnemyPlayer } from "@/lib/game/store"

interface MissilesProps {
  missiles: Missile[]
  enemies: EnemyPlayer[]
  playerPosition: [number, number, number]
  onMissileHit: (missileId: string, targetId: string) => void
  onMissileExpired: (id: string) => void
}

export function Missiles({ missiles, enemies, playerPosition, onMissileHit, onMissileExpired }: MissilesProps) {
  return (
    <>
      {missiles.map((m) => (
        <MissileMesh
          key={m.id}
          missile={m}
          enemies={enemies}
          playerPosition={playerPosition}
          onHit={onMissileHit}
          onExpired={onMissileExpired}
        />
      ))}
    </>
  )
}

function MissileMesh({
  missile,
  enemies,
  playerPosition,
  onHit,
  onExpired,
}: {
  missile: Missile
  enemies: EnemyPlayer[]
  playerPosition: [number, number, number]
  onHit: (missileId: string, targetId: string) => void
  onExpired: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const dirRef = useRef(new THREE.Vector3(missile.direction[0], missile.direction[1], missile.direction[2]))

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const dt = Math.min(delta, 0.05)

    if (Date.now() - missile.createdAt > GAME_CONFIG.MISSILE_LIFETIME) {
      onExpired(missile.id)
      return
    }

    let targetPos: THREE.Vector3 | null = null
    if (missile.targetId === "player") {
      targetPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2])
    } else {
      const enemy = enemies.find((e) => e.id === missile.targetId && e.alive)
      if (enemy) {
        targetPos = new THREE.Vector3(enemy.position[0], enemy.position[1], enemy.position[2])
      }
    }

    if (targetPos) {
      const pos = meshRef.current.position
      const toTarget = targetPos.clone().sub(pos).normalize()
      dirRef.current.lerp(toTarget, GAME_CONFIG.MISSILE_TURN_RATE * dt)
      dirRef.current.normalize()
    }

    const speed = GAME_CONFIG.MISSILE_SPEED
    meshRef.current.position.x += dirRef.current.x * speed * dt
    meshRef.current.position.y += dirRef.current.y * speed * dt
    meshRef.current.position.z += dirRef.current.z * speed * dt

    meshRef.current.lookAt(
      meshRef.current.position.x + dirRef.current.x,
      meshRef.current.position.y + dirRef.current.y,
      meshRef.current.position.z + dirRef.current.z
    )

    const checkCollision = (tPos: [number, number, number], tId: string) => {
      const dx = meshRef.current!.position.x - tPos[0]
      const dy = meshRef.current!.position.y - tPos[1]
      const dz = meshRef.current!.position.z - tPos[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < 12) {
        onHit(missile.id, tId)
        return true
      }
      return false
    }

    if (missile.ownerId === "player") {
      for (const enemy of enemies) {
        if (!enemy.alive) continue
        if (checkCollision(enemy.position, enemy.id)) return
      }
    } else {
      if (checkCollision(playerPosition, "player")) return
    }
  })

  return (
    <mesh ref={meshRef} position={missile.position}>
      <group>
        <mesh>
          <cylinderGeometry args={[0.15, 0.3, 2, 6]} />
          <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.3} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <coneGeometry args={[0.15, 0.5, 6]} />
          <meshStandardMaterial color="#cc3333" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <sphereGeometry args={[0.25, 6, 6]} />
          <meshBasicMaterial color="#ff6622" transparent opacity={0.8} />
        </mesh>
      </group>
    </mesh>
  )
}
