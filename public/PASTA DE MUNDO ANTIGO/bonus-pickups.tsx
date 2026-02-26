"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { BONUS_COLORS } from "@/lib/game/types"
import type { BonusPickup } from "@/lib/game/store"

interface BonusPickupsProps {
  bonuses: BonusPickup[]
  playerPosition: [number, number, number]
  onCollect: (id: string) => void
}

const PICKUP_RADIUS = 22

export function BonusPickups({ bonuses, playerPosition, onCollect }: BonusPickupsProps) {
  return (
    <>
      {bonuses
        .filter((b) => !b.collected)
        .map((bonus) => (
          <BonusOrb
            key={bonus.id}
            bonus={bonus}
            playerPosition={playerPosition}
            onCollect={onCollect}
          />
        ))}
    </>
  )
}

function BonusOrb({
  bonus,
  playerPosition,
  onCollect,
}: {
  bonus: BonusPickup
  playerPosition: [number, number, number]
  onCollect: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const color = BONUS_COLORS[bonus.type]
  const collectedRef = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current || collectedRef.current) return

    // Gentle bob
    const bobY = Math.sin(Date.now() * 0.002) * 1.5
    groupRef.current.position.y = bonus.position[1] + bobY

    // Rotate entire group
    groupRef.current.rotation.y += delta * 1.2

    // Rotate ring independently
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 2.5
      ringRef.current.rotation.z += delta * 0.8
    }

    // Check distance to player (use actual group position for Y)
    const dx = playerPosition[0] - bonus.position[0]
    const dy = playerPosition[1] - (bonus.position[1] + bobY)
    const dz = playerPosition[2] - bonus.position[2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < PICKUP_RADIUS) {
      collectedRef.current = true
      onCollect(bonus.id)
    }
  })

  const isWeapon = bonus.type === "missile" || bonus.type === "emp" || bonus.type === "mine"
  const orbSize = isWeapon ? 3.5 : 3.0
  // Thicker rings as requested
  const ringOuterRadius = orbSize + 2.0
  const ringTubeRadius = 0.55

  return (
    <group ref={groupRef} position={bonus.position}>
      {/* Main orb shape */}
      <mesh>
        {isWeapon ? (
          <dodecahedronGeometry args={[orbSize, 0]} />
        ) : (
          <octahedronGeometry args={[orbSize, 0]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>
      {/* Thick rotating ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[ringOuterRadius, ringTubeRadius, 10, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}
