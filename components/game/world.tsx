"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Sky } from "@react-three/drei"
import * as THREE from "three"
import { GAME_CONFIG } from "@/lib/game/types"

// ---- Noise helpers ----
function hash(x: number, z: number): number {
  let n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return n - Math.floor(n)
}
function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}
function fbmNoise(x: number, z: number, octaves = 5): number {
  let value = 0, amp = 1, freq = 1, maxVal = 0
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * freq, z * freq) * amp
    maxVal += amp; amp *= 0.45; freq *= 2.2
  }
  return value / maxVal
}

export function getTerrainHeight(x: number, z: number): number {
  const nx = x * 0.004, nz = z * 0.004
  let height = fbmNoise(nx, nz, 5) * 30
  const mNoise = fbmNoise(x * 0.0015 + 100, z * 0.0015 + 100, 4)
  height += Math.pow(Math.max(0, mNoise - 0.35) / 0.65, 2) * 80
  height += fbmNoise(x * 0.012 + 50, z * 0.012 + 50, 3) * 5
  // Flatten around runway/airport
  const rd = Math.sqrt(x * x + z * z)
  if (rd < 120) {
    const t = rd / 120
    const blend = t * t * (3 - 2 * t)
    height = height * blend + 0.5 * (1 - blend)
  }
  return Math.max(0.1, height)
}

// ---- Obstacle & Tree data for collisions ----
export interface ObstacleData { position: [number, number, number]; radius: number; height: number; type: "tower" | "rock" | "balloon" }
export interface TreeData { position: [number, number, number]; radius: number }

function seededGen(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

let _obstacleCache: ObstacleData[] | null = null
export function getObstacles(): ObstacleData[] {
  if (_obstacleCache) return _obstacleCache
  const arr: ObstacleData[] = []
  const types: ("tower" | "rock" | "balloon")[] = ["tower", "rock", "balloon"]
  const rand = seededGen(42)
  for (let i = 0; i < 12; i++) {
    const angle = rand() * Math.PI * 2
    const dist = 120 + rand() * 500
    const type = types[Math.floor(rand() * types.length)]
    const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist
    const th = getTerrainHeight(x, z)
    let y: number, radius: number, height: number
    if (type === "balloon") { y = Math.max(th + 20, 40 + rand() * 60); radius = 5; height = 12 }
    else if (type === "tower") { y = th + 15; radius = 4; height = 35 }
    else { y = th + 4; radius = 6; height = 10 }
    arr.push({ position: [x, y, z], radius, height, type })
  }
  _obstacleCache = arr
  return arr
}

let _treeCache: TreeData[] | null = null
export function getTrees(): TreeData[] {
  if (_treeCache) return _treeCache
  const arr: TreeData[] = []
  const rand = seededGen(123)
  for (let i = 0; i < 90; i++) {
    const angle = rand() * Math.PI * 2
    const dist = 60 + rand() * 550
    const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist
    if (Math.abs(x) < 30 && Math.abs(z) < GAME_CONFIG.RUNWAY_LENGTH / 2 + 30) continue
    const h = getTerrainHeight(x, z)
    if (h > 50 || h < 1.5) continue
    arr.push({ position: [x, h, z], radius: 3.5 })
  }
  _treeCache = arr
  return arr
}

// ---- Main world component ----
export function GameWorld({ stormRadius }: { stormRadius: number }) {
  return (
    <>
      <Sky distance={450000} sunPosition={[150, 150, 100]} inclination={0.4} azimuth={0.25} rayleigh={0.5} turbidity={8} mieCoefficient={0.003} mieDirectionalG={0.8} />
      <ambientLight intensity={0.65} color="#ffffff" />
      <directionalLight position={[150, 200, 100]} intensity={1.3} castShadow color="#fffacd"
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-far={500}
        shadow-camera-left={-200} shadow-camera-right={200} shadow-camera-top={200} shadow-camera-bottom={-200} />
      <hemisphereLight intensity={0.35} color="#87ceeb" groundColor="#4a7a2e" />
      <fog attach="fog" args={["#b0cfe0", 500, 1400]} />
      <TerrainMesh />
      <WaterPlane />
      <Runway />
      <AirportBase />
      <InstancedTrees />
      <Obstacles />
      <StormWall radius={stormRadius} />
    </>
  )
}

// ---- Terrain mesh ----
function TerrainMesh() {
  const geometry = useMemo(() => {
    const size = 700, res = 120
    const geo = new THREE.PlaneGeometry(size * 2, size * 2, res, res)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position.array as Float32Array
    const col = new Float32Array(pos.length)
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], z = pos[i + 2]
      const h = getTerrainHeight(x, z)
      pos[i + 1] = h
      let r: number, g: number, b: number
      if (h < 2) { r = 0.76; g = 0.73; b = 0.55 }
      else if (h < 10) { r = 0.28; g = 0.55; b = 0.15 }
      else if (h < 30) { const t = (h - 10) / 20; r = 0.28 + 0.07 * t; g = 0.55 - 0.1 * t; b = 0.15 + 0.03 * t }
      else if (h < 55) { const t = (h - 30) / 25; r = 0.35 + 0.2 * t; g = 0.45 + 0.05 * t; b = 0.18 + 0.22 * t }
      else { const t = Math.min(1, (h - 55) / 20); r = 0.55 + 0.37 * t; g = 0.50 + 0.41 * t; b = 0.40 + 0.50 * t }
      col[i] = r; col[i + 1] = g; col[i + 2] = b
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3))
    geo.computeVertexNormals()
    return geo
  }, [])
  return <mesh geometry={geometry} receiveShadow><meshLambertMaterial vertexColors /></mesh>
}

function WaterPlane() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => { if (ref.current) ref.current.position.y = 0.3 + Math.sin(Date.now() * 0.001) * 0.15 })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
      <planeGeometry args={[1600, 1600]} />
      <meshStandardMaterial color="#2a6496" transparent opacity={0.45} metalness={0.3} roughness={0.6} />
    </mesh>
  )
}

// ---- Longer runway ----
function Runway() {
  const rLen = GAME_CONFIG.RUNWAY_LENGTH
  const rW = GAME_CONFIG.RUNWAY_WIDTH
  return (
    <group position={[0, 0.6, 0]}>
      {/* Main asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[rW, rLen]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
      {/* Shoulder */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[rW + 8, rLen + 12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
      </mesh>
      {/* Center dashes */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} position={[0, 0.02, -rLen / 2 + i * (rLen / 20) + rLen / 40]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 4]} />
          <meshStandardMaterial color="#dddddd" />
        </mesh>
      ))}
      {/* Side lines */}
      <mesh position={[-rW / 2 + 0.3, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, rLen]} /><meshStandardMaterial color="#dddddd" /></mesh>
      <mesh position={[rW / 2 - 0.3, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, rLen]} /><meshStandardMaterial color="#dddddd" /></mesh>
      {/* Threshold markings */}
      {[-1, 1].map(end => (
        <group key={end}>
          {[-3, -1.5, 0, 1.5, 3].map((xOff, j) => (
            <mesh key={j} position={[xOff, 0.02, end * (rLen / 2 - 5)]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.8, 8]} />
              <meshStandardMaterial color="#dddddd" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ---- Airport base buildings ----
function AirportBase() {
  const th = getTerrainHeight(25, 0)
  return (
    <group position={[25, th + 0.3, 0]}>
      {/* Main hangar */}
      <mesh position={[0, 3, 0]}><boxGeometry args={[18, 6, 24]} /><meshStandardMaterial color="#7a7a7a" roughness={0.8} /></mesh>
      <mesh position={[0, 6.5, 0]}><boxGeometry args={[18, 1, 24]} /><meshStandardMaterial color="#5a5a5a" roughness={0.9} /></mesh>
      {/* Hangar door */}
      <mesh position={[-9.01, 2.2, 0]}><boxGeometry args={[0.1, 4.4, 10]} /><meshStandardMaterial color="#4a6a3a" roughness={0.7} /></mesh>
      {/* Control tower */}
      <mesh position={[14, 5, -8]}><boxGeometry args={[5, 10, 5]} /><meshStandardMaterial color="#888888" roughness={0.7} /></mesh>
      <mesh position={[14, 11, -8]}><boxGeometry args={[6, 2, 6]} /><meshStandardMaterial color="#555555" roughness={0.6} metalness={0.2} /></mesh>
      {/* Control tower windows */}
      <mesh position={[14, 11, -11.01]}><boxGeometry args={[4.5, 1.2, 0.1]} /><meshPhysicalMaterial color="#88ccff" transparent opacity={0.5} roughness={0.05} /></mesh>
      <mesh position={[14, 11, -4.99]}><boxGeometry args={[4.5, 1.2, 0.1]} /><meshPhysicalMaterial color="#88ccff" transparent opacity={0.5} roughness={0.05} /></mesh>
      {/* Antenna */}
      <mesh position={[14, 13.5, -8]}><cylinderGeometry args={[0.08, 0.08, 3, 4]} /><meshStandardMaterial color="#aaa" metalness={0.8} /></mesh>
      <mesh position={[14, 15, -8]}><sphereGeometry args={[0.2, 6, 6]} /><meshBasicMaterial color="#ff0000" /></mesh>
      {/* Small office */}
      <mesh position={[-8, 1.8, 18]}><boxGeometry args={[8, 3.5, 6]} /><meshStandardMaterial color="#8a7a6a" roughness={0.85} /></mesh>
      <mesh position={[-8, 3.8, 18]}><boxGeometry args={[8.5, 0.5, 6.5]} /><meshStandardMaterial color="#6a5a4a" roughness={0.9} /></mesh>
      {/* Fuel tanks */}
      <mesh position={[12, 1.5, 14]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.5, 1.5, 5, 8]} /><meshStandardMaterial color="#cc4444" roughness={0.6} /></mesh>
      <mesh position={[12, 1.5, 18]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.5, 1.5, 5, 8]} /><meshStandardMaterial color="#cccc44" roughness={0.6} /></mesh>
      {/* Windsock pole */}
      <mesh position={[-16, 4, -15]}><cylinderGeometry args={[0.08, 0.08, 8, 4]} /><meshStandardMaterial color="#aaa" metalness={0.5} /></mesh>
      <WindSock position={[-16, 8.5, -15]} />
    </group>
  )
}

function WindSock({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.3 })
  return (
    <mesh ref={ref} position={position} rotation={[0, 0, Math.PI / 6]}>
      <coneGeometry args={[0.5, 2.5, 6, 1, true]} />
      <meshStandardMaterial color="#ff6633" side={THREE.DoubleSide} roughness={0.8} />
    </mesh>
  )
}

// ---- Instanced trees for performance ----
function InstancedTrees() {
  const treeData = useMemo(() => getTrees(), [])
  const meshes = useMemo(() => {
    const count = treeData.length
    if (count === 0) return null

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 5)
    const cone1Geo = new THREE.ConeGeometry(2.8, 4.5, 5)
    const cone2Geo = new THREE.ConeGeometry(2.1, 3.5, 5)
    const cone3Geo = new THREE.ConeGeometry(1.3, 2.5, 5)

    const trunkMat = new THREE.MeshLambertMaterial({ color: "#5a3a1a" })
    const cone1Mat = new THREE.MeshLambertMaterial({ color: "#1a5c1a" })
    const cone2Mat = new THREE.MeshLambertMaterial({ color: "#237a23" })
    const cone3Mat = new THREE.MeshLambertMaterial({ color: "#2d8f2d" })

    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count)
    const cone1Mesh = new THREE.InstancedMesh(cone1Geo, cone1Mat, count)
    const cone2Mesh = new THREE.InstancedMesh(cone2Geo, cone2Mat, count)
    const cone3Mesh = new THREE.InstancedMesh(cone3Geo, cone3Mat, count)

    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    const matrix = new THREE.Matrix4()
    const rand = seededGen(999)

    for (let i = 0; i < count; i++) {
      const t = treeData[i]
      const s = 0.7 + rand() * 0.5

      scl.set(s, s, s)
      quat.identity()

      pos.set(t.position[0], t.position[1] + 2 * s, t.position[2])
      matrix.compose(pos, quat, scl)
      trunkMesh.setMatrixAt(i, matrix)

      pos.set(t.position[0], t.position[1] + 5 * s, t.position[2])
      matrix.compose(pos, quat, scl)
      cone1Mesh.setMatrixAt(i, matrix)

      pos.set(t.position[0], t.position[1] + 7 * s, t.position[2])
      matrix.compose(pos, quat, scl)
      cone2Mesh.setMatrixAt(i, matrix)

      pos.set(t.position[0], t.position[1] + 8.5 * s, t.position[2])
      matrix.compose(pos, quat, scl)
      cone3Mesh.setMatrixAt(i, matrix)
    }

    trunkMesh.instanceMatrix.needsUpdate = true
    cone1Mesh.instanceMatrix.needsUpdate = true
    cone2Mesh.instanceMatrix.needsUpdate = true
    cone3Mesh.instanceMatrix.needsUpdate = true

    return [trunkMesh, cone1Mesh, cone2Mesh, cone3Mesh]
  }, [treeData])

  if (!meshes) return null
  return (
    <>
      {meshes.map((m, i) => <primitive key={i} object={m} />)}
    </>
  )
}

// ---- Obstacles (only 20, individual is fine) ----
function Obstacles() {
  const obstacles = useMemo(() => getObstacles(), [])
  return (
    <>
      {obstacles.map((obs, i) => {
        if (obs.type === "tower") return (
          <group key={i} position={obs.position}>
            <mesh castShadow><cylinderGeometry args={[1.2, 1.8, 30, 6]} /><meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} /></mesh>
            <mesh position={[0, 16, 0]}><cylinderGeometry args={[0.1, 0.1, 4, 4]} /><meshStandardMaterial color="#aaa" metalness={0.8} /></mesh>
            <mesh position={[0, 18, 0]}><sphereGeometry args={[0.4, 6, 6]} /><meshBasicMaterial color="#ff0000" /></mesh>
          </group>
        )
        if (obs.type === "rock") return (
          <mesh key={i} position={obs.position} castShadow>
            <dodecahedronGeometry args={[4 + (i % 3), 1]} /><meshStandardMaterial color="#6a6a6a" roughness={0.95} />
          </mesh>
        )
        return (
          <group key={i} position={obs.position}>
            <mesh castShadow><sphereGeometry args={[3.5, 10, 10]} /><meshStandardMaterial color="#ff4444" roughness={0.5} /></mesh>
            <mesh position={[0, -5, 0]}><cylinderGeometry args={[0.15, 0.15, 6, 4]} /><meshStandardMaterial color="#8B6914" roughness={0.8} /></mesh>
          </group>
        )
      })}
    </>
  )
}

// ---- Storm wall ----
function StormWall({ radius }: { radius: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color("#4a0066") } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float time; uniform vec3 color; varying vec2 vUv;
      void main(){ float a=0.15+0.08*sin(vUv.y*20.0+time*2.0); a+=0.05*sin(vUv.x*15.0+time*1.5); gl_FragColor=vec4(color,a); }`,
    transparent: true, side: THREE.DoubleSide,
  }), [])
  useFrame((_, dt) => { mat.uniforms.time.value += dt })
  return <mesh material={mat} position={[0, 75, 0]}><cylinderGeometry args={[radius, radius, 250, 32, 1, true]} /></mesh>
}
