"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { GAME_CONFIG } from "@/lib/game/types"
import type { Bullet } from "@/lib/game/store"

interface BulletsProps {
  bullets: Bullet[]
  onBulletExpired: (id: string) => void
}

export function Bullets({ bullets, onBulletExpired }: BulletsProps) {
  return (
    <>
      {bullets.map((bullet) => (
        <BulletMesh key={bullet.id} bullet={bullet} onExpired={onBulletExpired} />
      ))}
    </>
  )
}

function BulletMesh({ bullet, onExpired }: { bullet: Bullet; onExpired: (id: string) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const dt = Math.min(delta, 0.05)
    ageRef.current += dt

    if (ageRef.current > 3) {
      onExpired(bullet.id)
      return
    }

    meshRef.current.position.x += bullet.direction[0] * GAME_CONFIG.BULLET_SPEED * dt
    meshRef.current.position.y += bullet.direction[1] * GAME_CONFIG.BULLET_SPEED * dt
    meshRef.current.position.z += bullet.direction[2] * GAME_CONFIG.BULLET_SPEED * dt
  })

  return (
    <mesh ref={meshRef} position={bullet.position}>
      <sphereGeometry args={[0.4, 4, 4]} />
      <meshBasicMaterial color="#ffcc00" />
    </mesh>
  )
}
