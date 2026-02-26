"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { GAME_CONFIG } from "@/lib/game/types"
import type { AirMine, EnemyPlayer } from "@/lib/game/store"

interface AirMinesProps {
  mines: AirMine[]
  enemies: EnemyPlayer[]
  playerPosition: [number, number, number]
  playerId: string
  onMineTriggered: (mineId: string, targetId: string) => void
  onMineExpired: (id: string) => void
}

export function AirMines({ mines, enemies, playerPosition, playerId, onMineTriggered, onMineExpired }: AirMinesProps) {
  return (
    <>
      {mines.map((mine) => (
        <MineMesh
          key={mine.id}
          mine={mine}
          enemies={enemies}
          playerPosition={playerPosition}
          playerId={playerId}
          onTriggered={onMineTriggered}
          onExpired={onMineExpired}
        />
      ))}
    </>
  )
}

function MineMesh({
  mine,
  enemies,
  playerPosition,
  playerId,
  onTriggered,
  onExpired,
}: {
  mine: AirMine
  enemies: EnemyPlayer[]
  playerPosition: [number, number, number]
  playerId: string
  onTriggered: (mineId: string, targetId: string) => void
  onExpired: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const pulseRef = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (Date.now() - mine.createdAt > GAME_CONFIG.MINE_LIFETIME) {
      onExpired(mine.id)
      return
    }

    pulseRef.current += delta * 3
    const scale = 1 + Math.sin(pulseRef.current) * 0.15
    groupRef.current.scale.setScalar(scale)
    groupRef.current.rotation.y += delta

    if (mine.ownerId === "player" || mine.ownerId === playerId) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue
        const dx = mine.position[0] - enemy.position[0]
        const dy = mine.position[1] - enemy.position[1]
        const dz = mine.position[2] - enemy.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < GAME_CONFIG.MINE_TRIGGER_RADIUS) {
          onTriggered(mine.id, enemy.id)
          return
        }
      }
    } else {
      const dx = mine.position[0] - playerPosition[0]
      const dy = mine.position[1] - playerPosition[1]
      const dz = mine.position[2] - playerPosition[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < GAME_CONFIG.MINE_TRIGGER_RADIUS) {
        onTriggered(mine.id, "player")
        return
      }
    }
  })

  return (
    <group ref={groupRef} position={mine.position}>
      <mesh>
        <dodecahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial
          color="#F97316"
          emissive="#F97316"
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5]} rotation={[0, 0, angle]}>
            <coneGeometry args={[0.2, 0.6, 4]} />
            <meshStandardMaterial color="#cc5500" metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}
