"use client"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"

type Telemetry = {
  speed: number
  altitude: number
  roll: number
  pitch: number
  yaw: number
  score?: number
  radarScore?: number
}

export function Cockpit3D({ getTelemetry, color = "#1f2937" }: { getTelemetry: () => Telemetry; color?: string }) {
  const panelRef = useRef<THREE.Group>(null)
  const speedNeedle = useRef<THREE.Mesh>(null)
  const altNeedle = useRef<THREE.Mesh>(null)
  const rollRing = useRef<THREE.Mesh>(null)
  const pitchPlate = useRef<THREE.Mesh>(null)
  const throttleLeft = useRef<THREE.Group>(null)
  const throttleRight = useRef<THREE.Group>(null)
  const yokeRef = useRef<THREE.Group>(null)
  const radarSweep = useRef<THREE.Mesh>(null)
  const hudGlass = useRef<THREE.Mesh>(null)
  const leftMfd = useRef<THREE.Mesh>(null)
  const rightMfd = useRef<THREE.Mesh>(null)
  const speedDigitalRef = useRef<any>(null)
  const altDigitalRef = useRef<any>(null)
  const scoreNumberRef = useRef<any>(null)
  const radarScoreNumberRef = useRef<any>(null)

  const radarBlips = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const angle = (i / 7) * Math.PI * 2 + 0.4
      const r = 0.06 + (i % 4) * 0.045
      const size = 0.008 + (i % 3) * 0.004
      return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, size }
    })
  }, [])

  useFrame((_, dt) => {
    const t = getTelemetry()
    const s = Math.max(0, Math.min(900, t.speed))
    const a = Math.max(0, Math.min(2000, t.altitude))
    const sc = t.score ?? 0
    const rsc = t.radarScore ?? 0

    if (speedNeedle.current) speedNeedle.current.rotation.z = -THREE.MathUtils.degToRad((s / 900) * 270 - 135)
    if (altNeedle.current) altNeedle.current.rotation.z = -THREE.MathUtils.degToRad(((a % 1000) / 1000) * 360)
    if (rollRing.current) rollRing.current.rotation.z = t.roll
    if (pitchPlate.current) pitchPlate.current.position.y = THREE.MathUtils.clamp(t.pitch * 0.08, -0.08, 0.08)
    if (yokeRef.current) {
      yokeRef.current.rotation.x = -THREE.MathUtils.clamp(t.pitch, -0.6, 0.6)
      yokeRef.current.rotation.z = -THREE.MathUtils.clamp(t.roll, -0.8, 0.8)
    }
    const throttle = THREE.MathUtils.clamp(s / 900, 0, 1)
    if (throttleLeft.current) throttleLeft.current.rotation.x = -0.7 + throttle * 0.7
    if (throttleRight.current) throttleRight.current.rotation.x = -0.7 + throttle * 0.7
    if (radarSweep.current) radarSweep.current.rotation.z -= dt * 1.5
    if (hudGlass.current) hudGlass.current.material.opacity = 0.28 + Math.abs(Math.sin(performance.now() * 0.001)) * 0.08
    if (leftMfd.current) leftMfd.current.material.emissiveIntensity = 1.0 + Math.abs(Math.sin(performance.now() * 0.0015)) * 0.35
    if (rightMfd.current) rightMfd.current.material.emissiveIntensity = 1.0 + Math.abs(Math.sin(performance.now() * 0.0012)) * 0.35
    if (speedDigitalRef.current) { speedDigitalRef.current.text = s.toFixed(0); speedDigitalRef.current.sync?.() }
    if (altDigitalRef.current) { altDigitalRef.current.text = a.toFixed(0); altDigitalRef.current.sync?.() }
    if (scoreNumberRef.current) { scoreNumberRef.current.text = Math.floor(sc).toString().padStart(5, "0"); scoreNumberRef.current.sync?.() }
    if (radarScoreNumberRef.current) { radarScoreNumberRef.current.text = Math.floor(rsc).toString().padStart(4, "0"); radarScoreNumberRef.current.sync?.() }
  })

  return (
    <group ref={panelRef} position={[0, 0.85, -0.1]}>
      <pointLight position={[-1.7, 1.0, 0.15]} intensity={1.6} color="#a5d8ff" distance={5} />
      <pointLight position={[1.7, 1.0, 0.15]} intensity={1.6} color="#a5d8ff" distance={5} />
      <pointLight position={[0, 0.6, -0.8]} intensity={0.9} color="#ffd166" distance={4} />
      <ambientLight intensity={0.65} color="#415a77" />

      <mesh position={[0, -0.6, -1.0]} castShadow>
        <boxGeometry args={[5.2, 0.3, 3.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.45} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.1, -0.8]} castShadow>
        <boxGeometry args={[4.9, 1.0, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.45, -0.35]} castShadow>
        <boxGeometry args={[4.4, 0.45, 1.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.85, 0.15]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[4.6, 0.2, 2.2]} />
        <meshStandardMaterial color="#243041" metalness={0.55} roughness={0.55} />
      </mesh>
      <mesh position={[-2.0, -0.25, -0.9]} castShadow>
        <boxGeometry args={[1.2, 0.25, 2.0]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.55} />
      </mesh>
      <mesh position={[2.0, -0.25, -0.9]} castShadow>
        <boxGeometry args={[1.2, 0.25, 2.0]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.55} />
      </mesh>

      <group position={[-1.3, 0.5, -0.12]}>
        <mesh>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.45} />
        </mesh>
        <mesh ref={speedNeedle} position={[0, 0, 0.03]}>
          <boxGeometry args={[0.02, 0.24, 0.02]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.4} />
        </mesh>
        <Text position={[0, -0.32, 0.02]} fontSize={0.032} color="#94a3b8" anchorX="center" anchorY="middle">SPD</Text>
      </group>

      <group position={[1.3, 0.5, -0.12]}>
        <mesh>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.45} />
        </mesh>
        <mesh ref={altNeedle} position={[0, 0, 0.03]}>
          <boxGeometry args={[0.02, 0.24, 0.02]} />
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={1.4} />
        </mesh>
        <Text position={[0, -0.32, 0.02]} fontSize={0.032} color="#94a3b8" anchorX="center" anchorY="middle">ALT</Text>
      </group>

      <group position={[-1.6, 0.05, -0.42]}>
        <mesh>
          <planeGeometry args={[0.42, 0.14]} />
          <meshStandardMaterial color="#0b1220" emissive="#1f2937" emissiveIntensity={1.1} metalness={0.95} roughness={0.08} />
        </mesh>
        <Text ref={speedDigitalRef} position={[0, 0, 0.01]} fontSize={0.065} color="#22c55e" anchorX="center" anchorY="middle">000</Text>
        <Text position={[0, 0.085, 0.01]} fontSize={0.02} color="#64748b" anchorX="center" anchorY="middle">KNOTS</Text>
      </group>

      <group position={[1.6, 0.05, -0.42]}>
        <mesh>
          <planeGeometry args={[0.42, 0.14]} />
          <meshStandardMaterial color="#0b1220" emissive="#1f2937" emissiveIntensity={1.1} metalness={0.95} roughness={0.08} />
        </mesh>
        <Text ref={altDigitalRef} position={[0, 0, 0.01]} fontSize={0.065} color="#60a5fa" anchorX="center" anchorY="middle">0000</Text>
        <Text position={[0, 0.085, 0.01]} fontSize={0.02} color="#64748b" anchorX="center" anchorY="middle">FT</Text>
      </group>

      <group position={[-1.4, -0.25, -0.55]}>
        <mesh ref={leftMfd}>
          <boxGeometry args={[0.75, 0.48, 0.06]} />
          <meshStandardMaterial color="#0f172a" emissive="#0f172a" emissiveIntensity={1.0} metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.68, 0.4]} />
          <meshStandardMaterial color="#020617" />
        </mesh>
        <Text position={[0, 0.16, 0.04]} fontSize={0.028} color="#94a3b8" anchorX="center" anchorY="bottom">SCORE</Text>
        <Text ref={scoreNumberRef} position={[0, 0.05, 0.04]} fontSize={0.055} color="#22c55e" anchorX="center" anchorY="middle">00000</Text>
      </group>

      <group position={[1.4, -0.25, -0.55]}>
        <mesh ref={rightMfd}>
          <boxGeometry args={[0.75, 0.48, 0.06]} />
          <meshStandardMaterial color="#0f172a" emissive="#0f172a" emissiveIntensity={1.0} metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.68, 0.4]} />
          <meshStandardMaterial color="#020617" />
        </mesh>
        <Text position={[0, 0.16, 0.04]} fontSize={0.026} color="#94a3b8" anchorX="center" anchorY="bottom">RADAR SCORE</Text>
        <Text ref={radarScoreNumberRef} position={[0, 0.05, 0.04]} fontSize={0.05} color="#67e8f9" anchorX="center" anchorY="middle">0000</Text>
      </group>

      <group position={[0, 0.46, -0.05]}>
        <mesh>
          <circleGeometry args={[0.36, 40]} />
          <meshStandardMaterial color="#0b3b2e" emissive="#1b7f5a" emissiveIntensity={1.0} metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.31, 0.34, 40]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.4} />
        </mesh>
        <mesh ref={radarSweep} position={[0, 0, 0.025]}>
          <ringGeometry args={[0.02, 0.3, 32, 1, 0, Math.PI / 5]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.7} transparent opacity={0.7} />
        </mesh>
        <group position={[0, 0, 0.03]}>
          {radarBlips.map((b, i) => (
            <mesh key={i} position={[b.x, b.y, 0]}>
              <circleGeometry args={[b.size, 8]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2.1} />
            </mesh>
          ))}
        </group>
      </group>

      <group position={[0, 0.68, 0.18]}>
        <mesh>
          <boxGeometry args={[1.7, 0.2, 0.45]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh ref={hudGlass} position={[0, 0.12, -0.07]} rotation={[-0.22, 0, 0]}>
          <planeGeometry args={[1.0, 0.4]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.38} metalness={0.2} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0.12, -0.08]} rotation={[-0.22, 0, 0]}>
          <planeGeometry args={[0.92, 0.34]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.28} />
        </mesh>
      </group>

      <group ref={yokeRef} position={[0, -0.25, 0.25]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.7, 0.05, 0.06]} />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.28, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[-0.28, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>

      <group position={[-2.0, -0.1, -0.3]}>
        <mesh>
          <boxGeometry args={[0.2, 0.4, 0.08]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>
        <group ref={throttleLeft} position={[0, 0, 0.08]}>
          <mesh>
            <boxGeometry args={[0.14, 0.2, 0.28]} />
            <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.8} metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      </group>


      <group position={[2.0, -0.1, -0.3]}>
        <mesh>
          <boxGeometry args={[0.2, 0.4, 0.08]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>
        <group ref={throttleRight} position={[0, 0, 0.08]}>
          <mesh>
            <boxGeometry args={[0.14, 0.2, 0.28]} />
            <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.8} metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      </group>

      <group position={[-0.9, -0.35, -0.75]}>
        <mesh>
          <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
          <meshStandardMaterial color="#1f2937" emissive="#1f2937" emissiveIntensity={0.4} metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh ref={rollRing} position={[0, 0, 0.04]}>
          <ringGeometry args={[0.08, 0.11, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>
      </group>

      <group position={[0.9, -0.35, -0.75]}>
        <mesh>
          <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
          <meshStandardMaterial color="#1f2937" emissive="#1f2937" emissiveIntensity={0.4} metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh ref={pitchPlate} position={[0, 0, 0.04]}>
          <planeGeometry args={[0.18, 0.12]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>
      </group>

      <group position={[0, 0.98, 0.35]}>
        <mesh>
          <boxGeometry args={[4.2, 0.16, 1.4]} />
          <meshStandardMaterial color="#1f2937" emissive="#1f2937" emissiveIntensity={0.4} metalness={0.5} roughness={0.65} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[-1.75 + i * 0.5, 0.09, 0.35]}>
            <cylinderGeometry args={[0.035, 0.035, 0.02, 10]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#ef4444" : "#f59e0b"} emissive={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#ef4444" : "#f59e0b"} emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>

      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`btn-left-${i}`} position={[-2.2, -0.05 + i * 0.12, -1.45]}>
          <boxGeometry args={[0.22, 0.06, 0.08]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`btn-right-${i}`} position={[2.2, -0.05 + i * 0.12, -1.45]}>
          <boxGeometry args={[0.22, 0.06, 0.08]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.6} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
