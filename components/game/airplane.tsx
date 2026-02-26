"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface AirplaneProps {
  color: string
  isPlayer?: boolean
}

/**
 * Low-poly "Falcon I" style airplane.
 * Angular/faceted surfaces, chunky proportions, flat shading.
 *
 * Color mapping from provided base color:
 * - Top fuselage: lighter tint of base color (yellow-ish)
 * - Bottom fuselage/belly: light gray-white
 * - Wings & tail: darker shade of base color (olive/khaki tone)
 * - Propeller: red
 * - Cockpit glass: translucent light blue
 * - Landing gear: dark gray / black
 */
export function AirplaneModel({ color, isPlayer = false }: AirplaneProps) {
  const propRef = useRef<THREE.Group>(null)

  const colors = useMemo(() => {
    const base = new THREE.Color(color)
    const hsl = { h: 0, s: 0, l: 0 }
    base.getHSL(hsl)

    // Top body: lighter version of the base
    const topBody = new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, Math.min(hsl.l * 1.3, 0.85))
    // Bottom body: light gray
    const belly = new THREE.Color("#d4d4d8")
    // Wings & tail: darker desaturated version
    const wing = new THREE.Color().setHSL(hsl.h, hsl.s * 0.6, hsl.l * 0.6)
    // Propeller blades: red
    const prop = new THREE.Color("#dc2626")
    // Cockpit glass
    const glass = new THREE.Color("#a5d8ff")
    // Landing gear
    const gear = new THREE.Color("#1c1c1c")
    const gearStrut = new THREE.Color("#8a7a3a")

    return { topBody, belly, wing, prop, glass, gear, gearStrut }
  }, [color])

  useFrame((_, delta) => {
    if (propRef.current) {
      propRef.current.rotation.z += delta * 30
    }
  })

  return (
    <group scale={isPlayer ? 1.0 : 0.85}>
      {/* ========== FUSELAGE ========== */}
      {/* Main body top - angular box shape */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[1.1, 0.65, 3.6]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Belly / bottom fuselage - slightly narrower, light gray */}
      <mesh castShadow position={[0, -0.25, 0.1]}>
        <boxGeometry args={[0.95, 0.35, 3.2]} />
        <meshStandardMaterial color={colors.belly} flatShading roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Nose taper - angular cone-like front */}
      <mesh castShadow position={[0, 0.05, -2.15]}>
        <boxGeometry args={[0.85, 0.55, 0.9]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.0, -2.65]}>
        <boxGeometry args={[0.6, 0.45, 0.45]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Nose tip / spinner */}
      <mesh position={[0, -0.02, -2.9]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.22, 0.3, 6]} />
        <meshStandardMaterial color={colors.belly} flatShading roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Nose belly */}
      <mesh position={[0, -0.2, -2.15]}>
        <boxGeometry args={[0.7, 0.25, 0.9]} />
        <meshStandardMaterial color={colors.belly} flatShading roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Rear fuselage taper toward tail */}
      <mesh castShadow position={[0, 0.12, 2.1]}>
        <boxGeometry args={[0.8, 0.5, 1.0]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.1, 2.7]}>
        <boxGeometry args={[0.55, 0.38, 0.7]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>

      {/* ========== COCKPIT ========== */}
      {/* Cockpit canopy - angular raised section */}
      <mesh castShadow position={[0, 0.65, -0.7]}>
        <boxGeometry args={[0.75, 0.35, 1.1]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Cockpit windshield - angled glass */}
      <mesh position={[0, 0.58, -1.35]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.6, 0.35, 0.3]} />
        <meshPhysicalMaterial
          color={colors.glass}
          flatShading
          transparent
          opacity={0.45}
          roughness={0.05}
          metalness={0.1}
          transmission={0.5}
        />
      </mesh>
      {/* Cockpit side windows */}
      <mesh position={[0.38, 0.58, -0.7]}>
        <boxGeometry args={[0.02, 0.25, 0.7]} />
        <meshPhysicalMaterial
          color={colors.glass}
          transparent
          opacity={0.35}
          roughness={0.05}
          transmission={0.5}
        />
      </mesh>
      <mesh position={[-0.38, 0.58, -0.7]}>
        <boxGeometry args={[0.02, 0.25, 0.7]} />
        <meshPhysicalMaterial
          color={colors.glass}
          transparent
          opacity={0.35}
          roughness={0.05}
          transmission={0.5}
        />
      </mesh>

      {/* ========== WINGS ========== */}
      {/* Right wing - low-mounted, swept back */}
      <FalconWing colors={colors} side={1} />
      {/* Left wing */}
      <FalconWing colors={colors} side={-1} />

      {/* ========== TAIL ========== */}
      {/* Vertical tail fin */}
      <mesh castShadow position={[0, 0.75, 2.9]}>
        <boxGeometry args={[0.08, 1.1, 0.8]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Fin top - tapered */}
      <mesh castShadow position={[0, 1.35, 3.05]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.07, 0.25, 0.5]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Horizontal stabilizers */}
      <mesh castShadow position={[1.0, 0.28, 2.9]}>
        <boxGeometry args={[1.6, 0.06, 0.65]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[-1.0, 0.28, 2.9]}>
        <boxGeometry args={[1.6, 0.06, 0.65]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>

      {/* ========== PROPELLER ========== */}
      <group ref={propRef} position={[0, -0.02, -3.05]}>
        {/* Hub */}
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 6]} />
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* 4 red blades */}
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.16, 1.5, 0.03]} />
          <meshStandardMaterial color={colors.prop} flatShading roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.16, 1.5, 0.03]} />
          <meshStandardMaterial color={colors.prop} flatShading roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* ========== LANDING GEAR ========== */}
      {/* Nose gear strut */}
      <mesh position={[0, -0.55, -1.8]}>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color={colors.gearStrut} flatShading roughness={0.5} />
      </mesh>
      {/* Nose wheel */}
      <mesh position={[0, -0.8, -1.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 6]} />
        <meshStandardMaterial color={colors.gear} roughness={0.8} />
      </mesh>

      {/* Right main gear strut */}
      <mesh position={[0.55, -0.55, 0.3]}>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial color={colors.gearStrut} flatShading roughness={0.5} />
      </mesh>
      {/* Right main wheel */}
      <mesh position={[0.55, -0.85, 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 6]} />
        <meshStandardMaterial color={colors.gear} roughness={0.8} />
      </mesh>

      {/* Left main gear strut */}
      <mesh position={[-0.55, -0.55, 0.3]}>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial color={colors.gearStrut} flatShading roughness={0.5} />
      </mesh>
      {/* Left main wheel */}
      <mesh position={[-0.55, -0.85, 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 6]} />
        <meshStandardMaterial color={colors.gear} roughness={0.8} />
      </mesh>
    </group>
  )
}

/**
 * Low-poly swept-back wing.
 * side: 1 = right, -1 = left
 */
function FalconWing({ colors, side }: { colors: { wing: THREE.Color; belly: THREE.Color }; side: 1 | -1 }) {
  return (
    <group position={[0, -0.15, 0.2]}>
      {/* Wing root - thicker near fuselage */}
      <mesh castShadow position={[side * 0.85, 0, 0]}>
        <boxGeometry args={[0.8, 0.1, 1.3]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Wing mid section */}
      <mesh castShadow position={[side * 1.65, -0.02, 0.15]}>
        <boxGeometry args={[0.9, 0.08, 1.15]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Wing outer section */}
      <mesh castShadow position={[side * 2.4, -0.04, 0.3]}>
        <boxGeometry args={[0.7, 0.06, 0.95]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Wing tip */}
      <mesh castShadow position={[side * 2.9, -0.05, 0.4]}>
        <boxGeometry args={[0.35, 0.05, 0.6]} />
        <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  )
}
