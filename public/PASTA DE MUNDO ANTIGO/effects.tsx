"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export interface Explosion {
  id: string
  position: [number, number, number]
  createdAt: number
  type: "bullet" | "missile" | "mine" | "emp"
}

interface EffectsProps {
  explosions: Explosion[]
  onExplosionDone: (id: string) => void
}

export function Effects({ explosions, onExplosionDone }: EffectsProps) {
  return (
    <>
      {explosions.map((exp) => (
        <ExplosionEffect key={exp.id} explosion={exp} onDone={onExplosionDone} />
      ))}
    </>
  )
}

function ExplosionEffect({ explosion, onDone }: { explosion: Explosion; onDone: (id: string) => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const ageRef = useRef(0)
  const doneRef = useRef(false)

  const maxAge = explosion.type === "emp" ? 1.2 : explosion.type === "missile" ? 0.8 : explosion.type === "mine" ? 1.0 : 0.4
  const maxScale = explosion.type === "emp" ? 60 : explosion.type === "missile" ? 10 : explosion.type === "mine" ? 12 : 3
  const color = explosion.type === "emp" ? "#F59E0B" : explosion.type === "missile" ? "#EF4444" : explosion.type === "mine" ? "#F97316" : "#ffcc00"

  useFrame((_, delta) => {
    if (!groupRef.current || doneRef.current) return
    ageRef.current += delta

    if (ageRef.current > maxAge) {
      doneRef.current = true
      onDone(explosion.id)
      return
    }

    const progress = ageRef.current / maxAge
    const scale = maxScale * Math.sin(progress * Math.PI)
    groupRef.current.scale.setScalar(scale)

    const children = groupRef.current.children
    for (const child of children) {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = 1 - progress
      }
    }
  })

  return (
    <group ref={groupRef} position={explosion.position}>
      {explosion.type === "emp" ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.8, 0.06, 8, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.5, 10, 10]} />
            <meshBasicMaterial color="#FBBF24" transparent opacity={0.3} />
          </mesh>
        </>
      ) : (
        <>
          <mesh>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.8, 8, 8]} />
            <meshBasicMaterial color="#ff8844" transparent opacity={0.4} />
          </mesh>
          {/* Debris particles using simple meshes */}
          {explosion.type === "missile" && (
            <>
              <mesh position={[0.3, 0.4, 0.2]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color="#444" transparent opacity={0.7} />
              </mesh>
              <mesh position={[-0.2, 0.3, -0.3]}>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshBasicMaterial color="#555" transparent opacity={0.7} />
              </mesh>
              <mesh position={[0.1, -0.2, 0.4]}>
                <boxGeometry args={[0.06, 0.06, 0.06]} />
                <meshBasicMaterial color="#666" transparent opacity={0.7} />
              </mesh>
            </>
          )}
        </>
      )}
    </group>
  )
}
