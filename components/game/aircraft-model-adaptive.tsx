"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface AircraftModelProps {
  color: string
  isPlayer?: boolean
  aircraftType?: 'fighter' | 'bomber' | 'attack' | 'helicopter' | 'transport' | 'drone'
}

/**
 * Modelo de aeronave adaptável por tipo
 * 
 * Fighter: Caça clássico com asas cortas e fuselagem esbelta
 * Bomber: Asas longas e fuselagem robusta
 * Attack: Asas médias com armamento visível
 * Helicopter: Rotores e fuselagem característica
 * Transport: Fuselagem larga e asas altas
 * Drone: Design futurista e compacto
 */
export function AircraftModel({ color, isPlayer = false, aircraftType = 'fighter' }: AircraftModelProps) {
  const propRef = useRef<THREE.Group>(null)
  const rotorRef = useRef<THREE.Group>(null)

  const colors = useMemo(() => {
    const base = new THREE.Color(color)
    const hsl = { h: 0, s: 0, l: 0 }
    base.getHSL(hsl)

    const topBody = new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, Math.min(hsl.l * 1.3, 0.85))
    const belly = new THREE.Color("#d4d4d8")
    const wing = new THREE.Color().setHSL(hsl.h, hsl.s * 0.6, hsl.l * 0.6)
    const prop = new THREE.Color("#dc2626")
    const glass = new THREE.Color("#a5d8ff")
    const gear = new THREE.Color("#1c1c1c")
    const gearStrut = new THREE.Color("#8a7a3a")

    return { topBody, belly, wing, prop, glass, gear, gearStrut }
  }, [color])

  useFrame((_, delta) => {
    if (propRef.current && (aircraftType === 'fighter' || aircraftType === 'attack')) {
      propRef.current.rotation.z += delta * 30
    }
    if (rotorRef.current && aircraftType === 'helicopter') {
      rotorRef.current.rotation.y += delta * 20
    }
  })

  // Configurações por tipo de aeronave
  const config = useMemo(() => {
    switch (aircraftType) {
      case 'bomber':
        return {
          scale: isPlayer ? 1.3 : 1.1,
          wingSpan: 4.5,
          fuselageWidth: 1.4,
          fuselageLength: 4.2,
          hasPropeller: false,
          hasRotor: false
        }
      case 'attack':
        return {
          scale: isPlayer ? 1.1 : 0.95,
          wingSpan: 3.2,
          fuselageWidth: 1.0,
          fuselageLength: 3.8,
          hasPropeller: true,
          hasRotor: false
        }
      case 'helicopter':
        return {
          scale: isPlayer ? 1.0 : 0.85,
          wingSpan: 2.5,
          fuselageWidth: 1.2,
          fuselageLength: 3.0,
          hasPropeller: false,
          hasRotor: true
        }
      case 'transport':
        return {
          scale: isPlayer ? 1.5 : 1.3,
          wingSpan: 5.0,
          fuselageWidth: 1.8,
          fuselageLength: 4.5,
          hasPropeller: true,
          hasRotor: false
        }
      case 'drone':
        return {
          scale: isPlayer ? 0.8 : 0.7,
          wingSpan: 2.8,
          fuselageWidth: 0.8,
          fuselageLength: 2.5,
          hasPropeller: true,
          hasRotor: false
        }
      default: // fighter
        return {
          scale: isPlayer ? 1.0 : 0.85,
          wingSpan: 3.6,
          fuselageWidth: 1.1,
          fuselageLength: 3.6,
          hasPropeller: true,
          hasRotor: false
        }
    }
  }, [aircraftType, isPlayer])

  return (
    <group scale={config.scale}>
      
      {/* ========== FUSELAGE ADAPTATIVO ========== */}
      {/* Corpo principal - varia por tipo */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[config.fuselageWidth, 0.65, config.fuselageLength]} />
        <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Belly / bottom fuselage */}
      <mesh castShadow position={[0, -0.25, 0.1]}>
        <boxGeometry args={[config.fuselageWidth * 0.85, 0.35, config.fuselageLength * 0.9]} />
        <meshStandardMaterial color={colors.belly} flatShading roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Helicopter specific body */}
      {aircraftType === 'helicopter' && (
        <>
          <mesh castShadow position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.6, 0.8, 2.5, 8]} />
            <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} />
          </mesh>
          {/* Tail boom */}
          <mesh castShadow position={[0, 0.2, 1.8]}>
            <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
            <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} />
          </mesh>
        </>
      )}

      {/* Transport specific - fuselagem larga */}
      {aircraftType === 'transport' && (
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[config.fuselageWidth, 0.9, config.fuselageLength]} />
          <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
        </mesh>
      )}

      {/* Bomber specific - fuselagem robusta */}
      {aircraftType === 'bomber' && (
        <mesh castShadow position={[0, 0.2, 0.3]}>
          <boxGeometry args={[config.fuselageWidth, 0.8, config.fuselageLength * 0.8]} />
          <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
        </mesh>
      )}

      {/* ========== ASAS ADAPTATIVAS ========== */}
      {aircraftType === 'helicopter' ? (
        // Helicopter skids instead of wings
        <>
          <mesh position={[-0.8, -0.6, 0]} castShadow>
            <boxGeometry args={[0.1, 0.1, 2]} />
            <meshStandardMaterial color={colors.gear} roughness={0.8} />
          </mesh>
          <mesh position={[0.8, -0.6, 0]} castShadow>
            <boxGeometry args={[0.1, 0.1, 2]} />
            <meshStandardMaterial color={colors.gear} roughness={0.8} />
          </mesh>
          <mesh position={[-0.4, -0.6, -0.8]} castShadow>
            <boxGeometry args={[0.8, 0.1, 0.1]} />
            <meshStandardMaterial color={colors.gear} roughness={0.8} />
          </mesh>
          <mesh position={[-0.4, -0.6, 0.8]} castShadow>
            <boxGeometry args={[0.8, 0.1, 0.1]} />
            <meshStandardMaterial color={colors.gear} roughness={0.8} />
          </mesh>
        </>
      ) : (
        // Wings for fixed-wing aircraft
        <>
          {/* Main wings - adaptativo por tipo */}
          <mesh position={[0, -0.05, 0.2]} castShadow>
            <boxGeometry args={[config.wingSpan, 0.08, aircraftType === 'bomber' ? 2.5 : aircraftType === 'transport' ? 3.0 : 1.8]} />
            <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
          </mesh>

          {/* Wing tips - diferentes por tipo */}
          {aircraftType === 'bomber' && (
            <>
              <mesh position={[-config.wingSpan/2 - 0.5, 0, 0.5]} castShadow>
                <boxGeometry args={[1, 0.06, 1.5]} />
                <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} />
              </mesh>
              <mesh position={[config.wingSpan/2 + 0.5, 0, 0.5]} castShadow>
                <boxGeometry args={[1, 0.06, 1.5]} />
                <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} />
              </mesh>
            </>
          )}

          {/* Drone specific - asas em forma de V */}
          {aircraftType === 'drone' && (
            <>
              <mesh position={[-config.wingSpan/2, 0.1, -0.3]} rotation={[0, 0, -0.2]} castShadow>
                <boxGeometry args={[config.wingSpan/2, 0.04, 0.8]} />
                <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} />
              </mesh>
              <mesh position={[config.wingSpan/2, 0.1, -0.3]} rotation={[0, 0, 0.2]} castShadow>
                <boxGeometry args={[config.wingSpan/2, 0.04, 0.8]} />
                <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} />
              </mesh>
            </>
          )}
        </>
      )}

      {/* ========== COCKPIT ADAPTATIVO ========== */}
      {aircraftType !== 'helicopter' ? (
        // Fixed-wing cockpit
        <>
          <mesh castShadow position={[0, 0.65, aircraftType === 'bomber' ? -0.5 : -0.7]}>
            <boxGeometry args={[aircraftType === 'bomber' ? 0.9 : 0.75, 0.35, aircraftType === 'transport' ? 1.5 : 1.1]} />
            <meshStandardMaterial color={colors.topBody} flatShading roughness={0.6} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.58, aircraftType === 'bomber' ? -1.0 : -1.35]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[aircraftType === 'bomber' ? 0.7 : 0.6, 0.35, 0.3]} />
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
        </>
      ) : (
        // Helicopter cockpit
        <>
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial
              color={colors.glass}
              transparent
              opacity={0.6}
              roughness={0.1}
            />
          </mesh>
        </>
      )}

      {/* ========== TAIL ADAPTATIVO ========== */}
      {aircraftType === 'helicopter' ? (
        // Helicopter tail rotor
        <>
          <group ref={rotorRef} position={[0, 0.5, 2.5]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
              <meshStandardMaterial color={colors.wing} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI/2]}>
              <boxGeometry args={[0.05, 0.6, 0.02]} />
              <meshStandardMaterial color={colors.wing} />
            </mesh>
          </group>
        </>
      ) : (
        // Fixed-wing tail
        <>
          {/* Vertical stabilizer */}
          <mesh castShadow position={[0, 0.7, config.fuselageLength/2 + 0.5]}>
            <boxGeometry args={[0.08, aircraftType === 'bomber' ? 1.6 : 1.4, aircraftType === 'transport' ? 1.5 : 1.2]} />
            <meshStandardMaterial color={aircraftType === 'bomber' ? colors.topBody : colors.wing} flatShading roughness={0.6} metalness={0.1} />
          </mesh>

          {/* Horizontal stabilizers */}
          <mesh castShadow position={[-1.2, 0.28, config.fuselageLength/2 + 0.5]} castShadow>
            <boxGeometry args={[2, 0.06, aircraftType === 'transport' ? 1.0 : 0.65]} />
            <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
          </mesh>
          <mesh castShadow position={[1.2, 0.28, config.fuselageLength/2 + 0.5]} castShadow>
            <boxGeometry args={[2, 0.06, aircraftType === 'transport' ? 1.0 : 0.65]} />
            <meshStandardMaterial color={colors.wing} flatShading roughness={0.6} metalness={0.1} />
          </mesh>
        </>
      )}

      {/* ========== PROPULSÃO ADAPTATIVA ========== */}
      {config.hasPropeller && (
        <group ref={propRef} position={[0, -0.02, -config.fuselageLength/2 - 0.5]}>
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
      )}

      {/* Helicopter main rotor */}
      {config.hasRotor && (
        <group ref={rotorRef} position={[0, 1.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[0.1, 3.5, 0.05]} />
            <meshStandardMaterial color={colors.wing} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI/2]}>
            <boxGeometry args={[0.1, 3.5, 0.05]} />
            <meshStandardMaterial color={colors.wing} />
          </mesh>
        </group>
      )}

      {/* ========== ARMAMENTO VISÍVEL (Attack e Fighter) ========== */}
      {(aircraftType === 'attack' || aircraftType === 'fighter') && (
        <>
          {[-1.2, -0.6, 0.6, 1.2].map((x, i) => (
            <group key={`missile-${i}`} position={[x, -0.25, 0.3]}>
              <mesh>
                <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
                <meshStandardMaterial color="#eeeeee" metalness={0.4} roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.04, 0.15, 6]} />
                <meshStandardMaterial color="#cc4444" metalness={0.4} roughness={0.5} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* ========== LANDING GEAR ADAPTATIVO ========== */}
      {/* Landing gear - adaptado por tipo */}
      {aircraftType !== 'helicopter' && (
        <>
          {/* Front gear */}
          <group position={[0, -0.55, aircraftType === 'bomber' ? -1.2 : -1.5]}>
            <mesh>
              <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
              <meshStandardMaterial color={colors.gearStrut} metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[aircraftType === 'transport' ? 0.15 : 0.1, aircraftType === 'transport' ? 0.15 : 0.1, 0.06, 12]} />
              <meshStandardMaterial color={colors.gear} roughness={0.9} />
            </mesh>
          </group>

          {/* Rear gear */}
          {[-0.8, 0.8].map((x, i) => (
            <group key={`rear-gear-${i}`} position={[x, -0.55, aircraftType === 'transport' ? 0.8 : 0.5]}>
              <mesh>
                <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
                <meshStandardMaterial color={colors.gearStrut} metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[aircraftType === 'transport' ? 0.18 : 0.12, aircraftType === 'transport' ? 0.18 : 0.12, 0.08, 12]} />
                <meshStandardMaterial color={colors.gear} roughness={0.9} />
              </mesh>
            </group>
          ))}
        </>
      )}
    </group>
  )
}