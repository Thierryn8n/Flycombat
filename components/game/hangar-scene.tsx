"use client"

import { useRef, useMemo, useEffect, useState, Suspense, Component, ReactNode } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Sky, PerspectiveCamera, OrbitControls, Loader } from "@react-three/drei"
import * as THREE from "three"
import type { AircraftPart } from "@/lib/aircraft-database"
import { PartMesh } from "./part-mesh"

class ErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("3D Scene Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

// =============================================
// PART MESH RENDERER
// =============================================
// Moved to ./part-mesh.tsx


// =============================================
// RUNWAY + TERRAIN
// =============================================

function Runway() {
  return (
    <group>
      {/* Main runway surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 120]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.85} />
      </mesh>

      {/* Runway center dashes */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={`dash-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, -50 + i * 6]}
          receiveShadow
        >
          <planeGeometry args={[0.3, 3]} />
          <meshStandardMaterial color="#cccccc" roughness={0.7} />
        </mesh>
      ))}

      {/* Runway edge lines */}
      {[-9.5, 9.5].map((x) => (
        <mesh
          key={`edge-${x}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.02, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.4, 120]} />
          <meshStandardMaterial color="#dddddd" roughness={0.7} />
        </mesh>
      ))}

      {/* Yellow taxi lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0.015, -5]} receiveShadow>
        <planeGeometry args={[10, 0.2]} />
        <meshStandardMaterial color="#d4a800" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0.015, 5]} receiveShadow>
        <planeGeometry args={[10, 0.2]} />
        <meshStandardMaterial color="#d4a800" roughness={0.7} />
      </mesh>

      {/* Taxiway surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18, 0.005, 0]} receiveShadow>
        <planeGeometry args={[16, 40]} />
        <meshStandardMaterial color="#444444" roughness={0.9} />
      </mesh>
    </group>
  )
}

// =============================================
// TERRAIN (flat ground around runway)
// =============================================

function Terrain() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#5a7a48" roughness={1} />
      </mesh>

      {/* Sand/dirt patches near runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0.001, 0]} receiveShadow>
        <planeGeometry args={[10, 80]} />
        <meshStandardMaterial color="#8a7a5a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, 0.001, 0]} receiveShadow>
        <planeGeometry args={[10, 80]} />
        <meshStandardMaterial color="#8a7a5a" roughness={1} />
      </mesh>
    </group>
  )
}

// =============================================
// MOUNTAINS (background)
// =============================================

function Mountains() {
  const mountains = useMemo(() => {
    const mtns: { x: number; z: number; sx: number; sy: number; sz: number; color: string }[] = []
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const dist = 120 + Math.random() * 60
      mtns.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        sx: 30 + Math.random() * 40,
        sy: 15 + Math.random() * 25,
        sz: 30 + Math.random() * 40,
        color: i % 2 === 0 ? "#4a6a3a" : "#3a5a2a",
      })
    }
    return mtns
  }, [])

  return (
    <group>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, m.sy * 0.4, m.z]}>
          <coneGeometry args={[m.sx, m.sy, 6]} />
          <meshStandardMaterial color={m.color} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// =============================================
// REAL AIRCRAFT (3D models from Supabase)
// =============================================

interface RealAircraftProps {
  color?: string
  position?: [number, number, number]
  modelCode?: string
  modelUrl?: string
  parts?: AircraftPart[]
  isSelected?: boolean
}

function RealAircraft({ color = "#888888", position = [0, 0, 0] as [number, number, number], modelCode, modelUrl, parts, isSelected }: RealAircraftProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Subtle idle animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.02
      if (isSelected) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
      }
    }
  })

  // Carregar modelo 3D real
  useEffect(() => {
    if (modelCode || modelUrl || (parts && parts.length > 0)) {
      setModelLoaded(true)
    }
  }, [modelCode, modelUrl, parts])

  const bodyColor = color
  const darkColor = "#333333"
  const cockpitColor = "#88ccee"
  const wingColor = "#666666"

  return (
    <group ref={groupRef} position={position} rotation={[0, -Math.PI * 0.15, 0]}>
      {/* Modelo 3D Real da Aeronave */}
      {modelLoaded ? (
        <RealAircraftModel 
          modelCode={modelCode}
          modelUrl={modelUrl}
          parts={parts}
          color={color}
          isSelected={isSelected}
        />
      ) : (
        <group scale={[1, 1, 1]}>
          {/* --- INÍCIO DO CÓDIGO DO AVIÃO (PROFISSIONAL) --- */}

          {/* ================= FUSELAGEM ================= */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.35, 6, 16]} />
            <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Nariz longo */}
          <mesh position={[0, 0.25, 3.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.35, 2.2, 16]} />
            <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Traseira afilada */}
          <mesh position={[0, 0.25, -3.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.5, 1.6, 16]} />
            <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.3} />
          </mesh>

          {/* ================= COCKPIT ================= */}
          <mesh position={[0, 0.9, 1.4]} rotation={[0.1, 0, 0]} castShadow>
            <sphereGeometry args={[0.55, 32, 32]} />
            <meshPhysicalMaterial 
              color="#99ccff" 
              transmission={0.9} 
              thickness={0.5} 
              roughness={0} 
              metalness={0} 
              clearcoat={1} 
            />
          </mesh>

          {/* ================= ASAS ================= */}
          {[-1, 1].map((side, i) => (
            <mesh 
              key={i} 
              position={[side * 1.8, 0.1, -0.3]} 
              rotation={[0, 0, side * 0.2]} 
              castShadow 
            >
              <boxGeometry args={[4.5, 0.15, 2]} />
              <meshStandardMaterial color={wingColor} metalness={0.8} roughness={0.3} />
            </mesh>
          ))}

          {/* Bordas frontais afiadas */}
          {[-1, 1].map((side, i) => (
            <mesh 
              key={"edge" + i} 
              position={[side * 3, 0.15, 1]} 
              rotation={[0, side * 0.3, 0]} 
              castShadow 
            >
              <boxGeometry args={[2.2, 0.1, 0.3]} />
              <meshStandardMaterial color={wingColor} />
            </mesh>
          ))}

          {/* ================= INTAKES ANGULADAS ================= */}
          {[-1, 1].map((side, i) => (
            <mesh 
              key={"intake" + i} 
              position={[side * 0.9, 0.1, 1.6]} 
              rotation={[0, side * 0.5, 0]} 
              castShadow 
            >
              <boxGeometry args={[0.6, 0.6, 1.4]} />
              <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
            </mesh>
          ))}

          {/* ================= V TAIL ================= */}
          {[-1, 1].map((side, i) => (
            <mesh 
              key={"tail" + i} 
              position={[side * 0.8, 1.2, -2.5]} 
              rotation={[0, 0, side * 0.6]} 
              castShadow 
            >
              <boxGeometry args={[0.2, 2.2, 1.2]} />
              <meshStandardMaterial color={wingColor} metalness={0.8} roughness={0.4} />
            </mesh>
          ))}

          {/* ================= MOTORES ================= */}
          {[-0.5, 0.5].map((x, i) => (
            <group key={"engine" + i} position={[x, 0.25, -4]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.3, 1.4, 24]} />
                <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
              </mesh>

              <mesh position={[0, 0, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.28, 24]} />
                <meshStandardMaterial 
                  emissive="#ff3300" 
                  emissiveIntensity={3} 
                  color="#ff2200" 
                />
              </mesh>
            </group>
          ))}

          {/* --- FIM DO CÓDIGO DO AVIÃO (PROFISSIONAL) --- */}
        </group>
      )}

      {/* Extras antigos removidos para o novo design profissional */}
    </group>
  )
}

// =============================================
// PILOT FIGURE
// =============================================

function Pilot({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.35, 0.6, 0.2]} />
        <meshStandardMaterial color="#4a5a3a" roughness={0.8} />
      </mesh>
      {/* Head with helmet */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#3a4a3a" roughness={0.7} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 0.95, 0.1]}>
        <sphereGeometry args={[0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1a3a5a" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.08, 0.1, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.15]} />
        <meshStandardMaterial color="#3a4a2a" roughness={0.8} />
      </mesh>
      <mesh position={[0.08, 0.1, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.15]} />
        <meshStandardMaterial color="#3a4a2a" roughness={0.8} />
      </mesh>
    </group>
  )
}

// =============================================
// HANGAR BUILDING (background)
// =============================================

function HangarBuilding() {
  return (
    <group position={[25, 0, -5]}>
      {/* Main structure */}
      <mesh position={[0, 4, 0]} castShadow>
        <boxGeometry args={[15, 8, 20]} />
        <meshStandardMaterial color="#6a6a6a" roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 8.5, 0]} castShadow>
        <boxGeometry args={[16, 1, 21]} />
        <meshStandardMaterial color="#555555" roughness={0.8} />
      </mesh>
      {/* Door opening */}
      <mesh position={[-7.6, 3, 0]}>
        <boxGeometry args={[0.5, 6, 12]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>
    </group>
  )
}

// =============================================
// CONTROL TOWER
// =============================================

function ControlTower() {
  return (
    <group position={[-30, 0, -25]}>
      {/* Base */}
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[5, 10, 5]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      {/* Top cabin */}
      <mesh position={[0, 11, 0]} castShadow>
        <boxGeometry args={[6, 2, 6]} />
        <meshStandardMaterial color="#555555" roughness={0.7} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 11, 3.1]}>
        <boxGeometry args={[5, 1.5, 0.1]} />
        <meshStandardMaterial color="#66aacc" metalness={0.3} roughness={0.1} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

// =============================================
// SCENE CONTENT
// =============================================

function SceneContent({ aircraftColor, modelCode, modelUrl, parts, isSelected }: HangarSceneProps) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[8, 4, -10]}
        fov={50}
        near={0.1}
        far={1000}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[30, 40, -20]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <hemisphereLight args={["#87ceeb", "#5a7a48", 0.3]} />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 40, -50]}
        inclination={0.55}
        azimuth={0.25}
        turbidity={8}
        rayleigh={2}
      />

      {/* Camera Controls - Suporte para mobile e PC */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={25}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.8}
        autoRotate={isSelected}
        autoRotateSpeed={0.5}
      />

      {/* Environment for reflections */}
      <Environment preset="dawn" />

      {/* Fog */}
      <fog attach="fog" args={["#b0c8e0", 80, 300]} />

      {/* Terrain and runway */}
      <Terrain />
      <Runway />

      {/* Mountains in background */}
      <Mountains />

      {/* Fighter jet on the runway */}
      <RealAircraft 
        color={aircraftColor} 
        position={[0, 0.8, 0]} 
        modelCode={modelCode}
        modelUrl={modelUrl}
        parts={parts}
        isSelected={isSelected}
      />

      {/* Pilot standing near the jet - Posicionado corretamente ao lado do cockpit */}
      <Pilot position={[2.0, 0, 1.0]} />

      {/* Background buildings */}
      <HangarBuilding />
      <ControlTower />
    </>
  )
}

// =============================================
// MAIN CANVAS EXPORT
// =============================================

interface HangarSceneProps {
  aircraftColor?: string
  modelCode?: string
  modelUrl?: string
  parts?: AircraftPart[]
  isSelected?: boolean
}

export default function HangarScene({ aircraftColor = "#888888", modelCode, modelUrl, parts, isSelected }: HangarSceneProps) {
  return (
    <div className="absolute inset-0">
      <ErrorBoundary fallback={
        <div className="flex items-center justify-center h-full w-full text-white bg-slate-900">
          <div className="text-center">
            <p className="text-red-500 font-bold text-xl mb-2">GRAPHICS ENGINE ERROR</p>
            <p className="text-slate-400 text-sm">Failed to initialize 3D context.</p>
          </div>
        </div>
      }>
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <SceneContent aircraftColor={aircraftColor} modelCode={modelCode} modelUrl={modelUrl} parts={parts} isSelected={isSelected} />
        </Suspense>
      </Canvas>
      <Loader />
      </ErrorBoundary>
    </div>
  )
}

// =============================================
// REAL AIRCRAFT 3D MODEL COMPONENT
// =============================================

interface RealAircraftModelProps {
  modelCode?: string
  modelUrl?: string
  parts?: AircraftPart[]
  color?: string
  isSelected?: boolean
}

function RealAircraftModel({ modelCode, modelUrl, parts, color = "#888888", isSelected }: RealAircraftModelProps) {
  const modelRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Animação de seleção
  useFrame((state) => {
    if (modelRef.current && isSelected) {
      modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.2
      modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.1
    }
  })

  // Se tiver parts, usar renderizador de parts
  if (parts && parts.length > 0) {
    return (
      <group ref={modelRef}>
        {parts.map((part, idx) => (
          <PartMesh key={(part.uid || part.id) + "-" + idx} part={part} />
        ))}
      </group>
    )
  }

  // Tentar carregar o modelo 3D real
  useEffect(() => {
    if (modelCode) {
      // Se tiver código do modelo, executar
      try {
        // Aqui você pode executar o código do modelo 3D
        // Por enquanto, vamos marcar como carregado
        setModelLoaded(true)
      } catch (error) {
        console.warn('Erro ao carregar modelo 3D por código:', error)
        setModelLoaded(false)
      }
    } else if (modelUrl) {
      // Se tiver URL, pode carregar de um arquivo
      // Por enquanto, vamos marcar como carregado
      setModelLoaded(true)
    }
  }, [modelCode, modelUrl])

  if (!modelLoaded) {
    // Fallback para um modelo simples se não conseguir carregar
    return (
      <group ref={modelRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.25, 0.4, 6, 8]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.25, 2.5, 8]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    )
  }

  // Aqui você pode renderizar o modelo 3D real
  // Por enquanto, vamos usar um modelo placeholder colorido
  return (
    <group ref={modelRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.25, 0.4, 6, 8]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.8} 
          roughness={0.2}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.1 : 0}
        />
      </mesh>
      {isSelected && (
        <pointLight 
          color={color} 
          intensity={0.5} 
          distance={10}
          position={[0, 0, 0]}
        />
      )}
    </group>
  )
}
