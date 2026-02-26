"use client"

import { useRef, useState, useCallback, useEffect, useMemo, Component, ReactNode } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Environment, Html, Text, GizmoHelper, GizmoViewport, GizmoViewcube, PivotControls, TransformControls } from "@react-three/drei"
import * as THREE from "three"
import type { AircraftPart } from "@/lib/aircraft-database"
import { PART_TYPE_COLORS } from "@/lib/aircraft-database"

class ViewerErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: any, info: any) {
    console.error("Viewer3D Error:", error, info)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

function OrientationHelpers() {
  return (
    <group>
      <Text
        position={[0, 0, -15]}
        fontSize={2}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        FRENTE (VOO)
      </Text>
      <Text
        position={[0, 0, 15]}
        fontSize={2}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        TRÁS
      </Text>
      <Text
        position={[0, 0, -12]}
        fontSize={0.5}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        ▼
      </Text>
    </group>
  )
}

function applyTipDeform(geometry: THREE.BufferGeometry, part: AircraftPart) {
  const axis = part.tipAxis
  const taper = Math.min(1, Math.max(0, Number(part.tipTaper ?? 0)))
  const round = Math.min(1, Math.max(0, Number(part.tipRound ?? 0)))
  if (!axis || (taper <= 0 && round <= 0)) return geometry
  const pos = geometry.attributes.position
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return geometry
  const min = box.min
  const max = box.max
  const axisKey = axis[0] as "x" | "y" | "z"
  const dir = axis[1] === "+" ? 1 : -1
  const axisMin = min[axisKey]
  const axisMax = max[axisKey]
  const length = Math.max(0.0001, axisMax - axisMin)
  const range = length * 0.35
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const coord = axisKey === "x" ? x : axisKey === "y" ? y : z
    const dist = dir > 0 ? axisMax - coord : coord - axisMin
    const t = 1 - Math.min(Math.max(dist / range, 0), 1)
    if (t <= 0) continue
    const smooth = t * t * (3 - 2 * t)
    const scale = 1 - taper * smooth
    const pinch = round * smooth * length * 0.08
    if (axisKey === "x") {
      pos.setY(i, y * scale)
      pos.setZ(i, z * scale)
      pos.setX(i, coord + (dir > 0 ? pinch : -pinch))
    } else if (axisKey === "y") {
      pos.setX(i, x * scale)
      pos.setZ(i, z * scale)
      pos.setY(i, coord + (dir > 0 ? pinch : -pinch))
    } else {
      pos.setX(i, x * scale)
      pos.setY(i, y * scale)
      pos.setZ(i, coord + (dir > 0 ? pinch : -pinch))
    }
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function geometryType(part: AircraftPart) {
  if (part.shape === "fuselage_round") return "fuselage"
  if (part.shape === "wing_swept") return "wing"
  if (part.shape === "tail_swept") return "tail_v"
  if (part.shape === "nose_cone") return "nose"
  if (part.shape === "engine") return "engine"
  if (part.shape === "missile") return "missile"
  if (part.shape === "canopy") return "canopy"
  if (part.shape === "fuel_tank") return "fuel_tank"
  if (part.shape === "intake_scoop") return "intake"
  if (part.shape === "cannon") return "cannon"
  if (part.shape === "nozzle") return "nozzle"
  if (part.shape === "sphere") return "radar"
  return part.type
}

function createWingShape(w: number, d: number) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(w * 0.3, d * 0.5)
  shape.lineTo(w, d * 0.35)
  shape.lineTo(w * 0.95, d * 0.15)
  shape.lineTo(w * 0.15, -d * 0.5)
  shape.lineTo(0, -d * 0.45)
  shape.closePath()
  return shape
}

function createFuselageShape(w: number, h: number) {
  const shape = new THREE.Shape()
  const r = Math.min(h, w) * 0.35
  shape.moveTo(-w / 2 + r, -h / 2)
  shape.lineTo(w / 2 - r, -h / 2)
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  shape.lineTo(w / 2, h / 2 - r)
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  shape.lineTo(-w / 2 + r, h / 2)
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  shape.lineTo(-w / 2, -h / 2 + r)
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return shape
}

function createTailVShape(w: number, h: number) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(w * 0.4, h)
  shape.lineTo(w * 0.8, h)
  shape.lineTo(w, 0)
  shape.closePath()
  return shape
}

function AircraftPartMesh({
  part,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onUnhover,
}: {
  part: AircraftPart & { uid: string }
  isSelected: boolean
  isHovered: boolean
  onSelect: (uid: string, multi: boolean) => void
  onHover: (uid: string) => void
  onUnhover: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const opacity = Number(part.opacity ?? 1.0)
  const isTransparent = opacity < 1 || part.type === "canopy" || part.type === "cockpit"

  const w = Math.max(0.001, Number(part.w) || 1)
  const h = Math.max(0.001, Number(part.h) || 1)
  const d = Math.max(0.001, Number(part.d) || 1)
  const px = Number(part.x) || 0
  const py = Number(part.y) || 0
  const pz = Number(part.z) || 0
  const centerX = px + w / 2
  const centerY = py + h / 2
  const centerZ = pz + d / 2
  const type = geometryType(part)
  const geometry = useMemo(() => {
    if (type === "fuselage") {
      const shape = createFuselageShape(d, h)
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: w,
        bevelEnabled: true,
        bevelThickness: Math.min(h, d) * 0.15,
        bevelSize: Math.min(h, d) * 0.12,
        bevelSegments: 6,
      })
      geo.rotateY(Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (["wing", "leading_edge", "flap", "aileron", "lerx", "canard", "tail_h"].includes(type)) {
      const shape = createWingShape(w, d)
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: h,
        bevelEnabled: true,
        bevelThickness: h * 0.3,
        bevelSize: Math.min(w, d) * 0.02,
        bevelSegments: 3,
      })
      geo.rotateX(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "tail_v") {
      const shape = createTailVShape(w, h)
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: d,
        bevelEnabled: true,
        bevelThickness: d * 0.2,
        bevelSize: d * 0.1,
        bevelSegments: 3,
      })
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "nose" || type === "nose_tip") {
      const geo = new THREE.ConeGeometry(Math.max(h, d) / 2, w, 12)
      geo.rotateZ(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "engine" || type === "afterburner" || type === "nozzle") {
      const rTop = type === "nozzle" ? Math.max(h, d) * 0.35 : Math.max(h, d) * 0.45
      const rBot = Math.max(h, d) * 0.5
      const geo = new THREE.CylinderGeometry(rTop, rBot, w, 16)
      geo.rotateZ(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "canopy" || type === "cockpit" || type === "hud") {
      const maxDim = Math.max(w, h, d)
      const geo = new THREE.SphereGeometry(maxDim / 2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
      geo.scale(w / maxDim, h / maxDim, d / maxDim)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "intake" || type === "ramp") {
      const shape = new THREE.Shape()
      shape.moveTo(0, -h / 2)
      shape.lineTo(0, h / 2)
      shape.lineTo(d * 0.8, h * 0.3)
      shape.lineTo(d * 0.8, -h * 0.3)
      shape.closePath()
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: w,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2,
      })
      geo.rotateY(Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "missile") {
      const radius = Math.max(h, d) / 2
      const bodyLen = w * 0.75
      const tipLen = w * 0.25
      const points: THREE.Vector2[] = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(radius * 0.3, tipLen * 0.3),
        new THREE.Vector2(radius, tipLen),
        new THREE.Vector2(radius, tipLen + bodyLen * 0.9),
        new THREE.Vector2(radius * 1.15, tipLen + bodyLen),
        new THREE.Vector2(0, tipLen + bodyLen),
      ]
      const geo = new THREE.LatheGeometry(points, 8)
      geo.rotateZ(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "fuel_tank") {
      const radius = Math.max(h, d) / 2
      const geo = new THREE.CapsuleGeometry(radius, Math.max(0.01, w - radius * 2), 8, 12)
      geo.rotateZ(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "landing_gear") {
      const strutR = Math.min(w, d) * 0.1
      const geo = new THREE.CylinderGeometry(strutR, strutR * 1.3, h, 8)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "pylon") {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      shape.lineTo(w, 0)
      shape.lineTo(w * 0.8, -h)
      shape.lineTo(w * 0.2, -h)
      shape.closePath()
      const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: d * 0.3, bevelEnabled: false })
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "weapon_bay") {
      const geo = new THREE.BoxGeometry(w, h, d)
      geo.center()
      return geo
    }
    if (type === "cannon" || type === "pitot") {
      const radius = Math.max(h, d) * 0.3
      const geo = new THREE.CylinderGeometry(radius, radius, w, 8)
      geo.rotateZ(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "radar") {
      const radius = Math.max(h, d) / 2
      const geo = new THREE.CylinderGeometry(radius, radius, w * 0.3, 16)
      geo.rotateZ(-Math.PI / 2)
      geo.center()
      return applyTipDeform(geo, part)
    }
    if (type === "seat") {
      const geo = new THREE.BoxGeometry(w, h, d)
      geo.center()
      return applyTipDeform(geo, part)
    }
    const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2)
    geo.center()
    return applyTipDeform(geo, part)
  }, [type, w, h, d, part])
  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry])

  const rotation = [
    (((Number(part.rotationX) || 0)) * Math.PI) / 180,
    (((Number(part.rotationY) || 0)) * Math.PI) / 180,
    (((Number(part.rotationZ) || 0)) * Math.PI) / 180,
  ] as [number, number, number]

  const displayColor = isSelected ? "#3B82F6" : isHovered ? "#60A5FA" : part.color
  const displayOpacity = isSelected ? 0.85 : isHovered ? 0.9 : opacity

  const materialProps = {
    color: displayColor,
    transparent: isTransparent || isSelected || isHovered,
    opacity: displayOpacity,
    roughness: 0.5,
    metalness: 0.4,
    emissive: isSelected ? "#2563eb" : isHovered ? "#1e40af" : "#000000",
    emissiveIntensity: isSelected ? 0.15 : isHovered ? 0.05 : 0,
  }

  return (
    <group
      ref={groupRef}
      position={[centerX, centerY, centerZ]}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(part.uid!, e.nativeEvent.ctrlKey || e.nativeEvent.metaKey)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(part.uid!)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        onUnhover()
        document.body.style.cursor = "default"
      }}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {isSelected && (
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial color="#3B82F6" linewidth={2} />
        </lineSegments>
      )}
      {isHovered && !isSelected && (
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial color="#60A5FA" linewidth={1} />
        </lineSegments>
      )}
    </group>
  )
}

function WireframePart({
  part,
  isSelected,
}: {
  part: AircraftPart & { uid: string }
  isSelected: boolean
}) {
  const w = Math.max(0.001, Number(part.w) || 1)
  const h = Math.max(0.001, Number(part.h) || 1)
  const d = Math.max(0.001, Number(part.d) || 1)
  const px = Number(part.x) || 0
  const py = Number(part.y) || 0
  const pz = Number(part.z) || 0
  const centerX = px + w / 2
  const centerY = py + h / 2
  const centerZ = pz + d / 2

  return (
    <lineSegments
      position={[centerX, centerY, centerZ]}
      rotation={[
        (((Number(part.rotationX) || 0)) * Math.PI) / 180,
        (((Number(part.rotationY) || 0)) * Math.PI) / 180,
        (((Number(part.rotationZ) || 0)) * Math.PI) / 180,
      ]}
    >
      <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
      <lineBasicMaterial color={isSelected ? "#3B82F6" : "#64748B"} />
    </lineSegments>
  )
}

function RotationGizmo({
  center,
  scale,
  onStart,
  onRotate,
  onEnd,
  currentAngles,
  onSetAngle,
}: {
  center: [number, number, number]
  scale: number
  onStart?: () => void
  onRotate: (axis: "x" | "y" | "z", deltaRad: number) => void
  onEnd?: () => void
  currentAngles: { x: number; y: number; z: number }
  onSetAngle: (axis: "x" | "y" | "z", deg: number) => void
}) {
  const activeAxis = useRef<"x" | "y" | "z" | null>(null)
  const prevAngle = useRef<number | null>(null)
  const centerVec = useMemo(() => new THREE.Vector3(center[0], center[1], center[2]), [center])
  const [uiAngle, setUiAngle] = useState<number | null>(null)
  const ringR = 0.85
  const tickLen = 0.06
  const majorAngles = [0, 90, 180, 270]
  const buildTicks = useCallback((axis: "x" | "y" | "z") => {
    const positions: number[] = []
    const steps = 24
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      let x = 0, y = 0, z = 0
      if (axis === "z") { x = Math.cos(a); y = Math.sin(a); z = 0 }
      if (axis === "y") { x = Math.cos(a); y = 0; z = Math.sin(a) }
      if (axis === "x") { x = 0; y = Math.cos(a); z = Math.sin(a) }
      const nx = x, ny = y, nz = z
      positions.push(nx * ringR, ny * ringR, nz * ringR)
      positions.push(nx * (ringR + tickLen), ny * (ringR + tickLen), nz * (ringR + tickLen))
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])
  const handleDown = useCallback((axis: "x" | "y" | "z", e: any) => {
    e.stopPropagation()
    activeAxis.current = axis
    prevAngle.current = null
    onStart?.()
    const v = activeAxis.current === "x" ? currentAngles.x : activeAxis.current === "y" ? currentAngles.y : currentAngles.z
    setUiAngle(v)
  }, [onStart])
  const handleMove = useCallback((e: any) => {
    if (!activeAxis.current) return
    const p = new THREE.Vector3(e.point.x, e.point.y, e.point.z).sub(centerVec)
    let angle = 0
    if (activeAxis.current === "x") angle = Math.atan2(p.z, p.y)
    if (activeAxis.current === "y") angle = Math.atan2(p.x, p.z)
    if (activeAxis.current === "z") angle = Math.atan2(p.y, p.x)
    if (prevAngle.current == null) { prevAngle.current = angle; return }
    const delta = angle - prevAngle.current
    prevAngle.current = angle
    if (Math.abs(delta) > 1e-5) onRotate(activeAxis.current, delta)
    const v = activeAxis.current === "x" ? currentAngles.x : activeAxis.current === "y" ? currentAngles.y : currentAngles.z
    setUiAngle(v)
  }, [centerVec, onRotate])
  const handleUp = useCallback((e: any) => {
    if (!activeAxis.current) return
    activeAxis.current = null
    prevAngle.current = null
    onEnd?.()
    setUiAngle(null)
  }, [onEnd])
  return (
    <group position={center} scale={scale}>
      <group rotation={[0, 0, 0]}>
        <mesh onPointerDown={(e) => handleDown("z", e)} onPointerMove={handleMove} onPointerUp={handleUp}>
          <torusGeometry args={[ringR, 0.025, 16, 64]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <lineSegments geometry={buildTicks("z")}>
          <lineBasicMaterial color="#60a5fa" />
        </lineSegments>
        {majorAngles.map((deg) => {
          const a = (deg * Math.PI) / 180
          const x = Math.cos(a) * (ringR + tickLen * 1.6)
          const y = Math.sin(a) * (ringR + tickLen * 1.6)
          return (
            <Text key={`z${deg}`} position={[x, y, 0]} fontSize={0.12} color="#93c5fd">
              {deg}°
            </Text>
          )
        })}
      </group>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh onPointerDown={(e) => handleDown("y", e)} onPointerMove={handleMove} onPointerUp={handleUp}>
          <torusGeometry args={[ringR, 0.025, 16, 64]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <lineSegments geometry={buildTicks("y")}>
          <lineBasicMaterial color="#34d399" />
        </lineSegments>
        {majorAngles.map((deg) => {
          const a = (deg * Math.PI) / 180
          const x = Math.cos(a) * (ringR + tickLen * 1.6)
          const z = Math.sin(a) * (ringR + tickLen * 1.6)
          return (
            <Text key={`y${deg}`} position={[x, 0, z]} fontSize={0.12} color="#86efac">
              {deg}°
            </Text>
          )
        })}
      </group>
      <group rotation={[0, Math.PI / 2, 0]}>
        <mesh onPointerDown={(e) => handleDown("x", e)} onPointerMove={handleMove} onPointerUp={handleUp}>
          <torusGeometry args={[ringR, 0.025, 16, 64]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <lineSegments geometry={buildTicks("x")}>
          <lineBasicMaterial color="#f87171" />
        </lineSegments>
        {majorAngles.map((deg) => {
          const a = (deg * Math.PI) / 180
          const y = Math.cos(a) * (ringR + tickLen * 1.6)
          const z = Math.sin(a) * (ringR + tickLen * 1.6)
          return (
            <Text key={`x${deg}`} position={[0, y, z]} fontSize={0.12} color="#fecaca">
              {deg}°
            </Text>
          )
        })}
      </group>
      {uiAngle != null && activeAxis.current && (
        <Html position={[0, 0, 0]} center occlude>
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 6px", background: "rgba(15,23,42,0.8)", border: "1px solid #334155", borderRadius: 6 }}>
            <span style={{ color: "#e2e8f0", fontSize: 12 }}>{activeAxis.current.toUpperCase()}:</span>
            <input
              type="number"
              step={0.5}
              value={Number(uiAngle.toFixed(2))}
              onChange={(e) => {
                const v = Number(e.target.value || 0)
                setUiAngle(v)
                onSetAngle(activeAxis.current!, v)
              }}
              style={{ width: 64, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1f2937", borderRadius: 4, fontSize: 12, padding: "2px 4px" }}
            />
          </div>
        </Html>
      )}
    </group>
  )
}

function AxisHelper() {
  return (
    <group>
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5, 0xef4444]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x22c55e]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x3b82f6]} />
    </group>
  )
}

const SNAP_FINE = 0.5
const ROTATE_GAIN = 2
const RIGHT_MAGNET = 2
function snapAngleFine(deg: number) { return Math.round(deg / SNAP_FINE) * SNAP_FINE }
function normalizeDeg(deg: number) { let v = ((deg % 360) + 360) % 360; if (v > 180) v -= 360; return v }
function snapRightAngles(deg: number) {
  const nearest = Math.round(deg / 90) * 90
  return Math.abs(normalizeDeg(deg) - normalizeDeg(nearest)) <= RIGHT_MAGNET ? nearest : deg
}
function snapPos(v: number) { return Math.round(v * 10) / 10 }

function PartWithGizmo({
  part,
  isSelected,
  hoveredId,
  onSelect,
  transformMode,
  onUpdatePart,
  onUpdatePartLive,
  onTransformStart,
  onTransformEnd,
  wireMode,
}: {
  part: AircraftPart & { uid: string }
  isSelected: boolean
  hoveredId: string | null
  onSelect: (uid: string, multi: boolean) => void
  transformMode: "none" | "rotate" | "translate"
  onUpdatePart: (uid: string, updates: Partial<AircraftPart>) => void
  onUpdatePartLive?: (uid: string, updates: Partial<AircraftPart>) => void
  onTransformStart?: () => void
  onTransformEnd?: () => void
  wireMode?: boolean
}) {
  const lastMatrix = useRef<THREE.Matrix4 | null>(null)
  const [gizmoKey, setGizmoKey] = useState(0)
  const draggingRef = useRef(false)
  const prevMatrixRef = useRef<THREE.Matrix4 | null>(null)
  const { camera } = useThree()
  const [gizmoScale, setGizmoScale] = useState(1.6)
  const axisLockRef = useRef<"x"|"y"|"z"|null>(null)
  const snapHoldRef = useRef(false)
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === "KeyX") axisLockRef.current = "x"
      if (e.code === "KeyY") axisLockRef.current = "y"
      if (e.code === "KeyZ") axisLockRef.current = "z"
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") snapHoldRef.current = true
    }
    const ku = (e: KeyboardEvent) => {
      if (["KeyX","KeyY","KeyZ"].includes(e.code)) axisLockRef.current = null
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") snapHoldRef.current = false
    }
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku) }
  }, [])

  const handleDrag = useCallback((localMatrix: THREE.Matrix4) => {
    lastMatrix.current = localMatrix.clone()
    if (!draggingRef.current) {
      draggingRef.current = true
      onTransformStart?.()
    }
    if (!onUpdatePartLive) return
    if (!prevMatrixRef.current) {
      prevMatrixRef.current = localMatrix.clone()
      return
    }
    const invPrev = prevMatrixRef.current.clone().invert()
    const deltaMatrix = localMatrix.clone().multiply(invPrev)
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    const euler = new THREE.Euler()
    deltaMatrix.decompose(position, quaternion, scale)
    const updates: Partial<AircraftPart> = {}
    if (transformMode !== "rotate") {
      if (Math.abs(position.x) > 0.0001) updates.x = (part.x || 0) + position.x
      if (Math.abs(position.y) > 0.0001) updates.y = (part.y || 0) + position.y
      if (Math.abs(position.z) > 0.0001) updates.z = (part.z || 0) + position.z
    }
    if (transformMode !== "translate") {
      const baseEuler = new THREE.Euler(
        THREE.MathUtils.degToRad(Number(part.rotationX) || 0),
        THREE.MathUtils.degToRad(Number(part.rotationY) || 0),
        THREE.MathUtils.degToRad(Number(part.rotationZ) || 0),
        "XYZ"
      )
      const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler)
      const deltaEuler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ")
      const lock = axisLockRef.current
      deltaEuler.x = (lock && lock !== "x") ? 0 : deltaEuler.x * ROTATE_GAIN
      deltaEuler.y = (lock && lock !== "y") ? 0 : deltaEuler.y * ROTATE_GAIN
      deltaEuler.z = (lock && lock !== "z") ? 0 : deltaEuler.z * ROTATE_GAIN
      const gainQuat = new THREE.Quaternion().setFromEuler(deltaEuler, "XYZ")
      baseQuat.premultiply(gainQuat)
      const outEuler = new THREE.Euler().setFromQuaternion(baseQuat, "XYZ")
      let rx = THREE.MathUtils.radToDeg(outEuler.x)
      let ry = THREE.MathUtils.radToDeg(outEuler.y)
      let rz = THREE.MathUtils.radToDeg(outEuler.z)
      if (snapHoldRef.current) {
        rx = snapAngleFine(rx); ry = snapAngleFine(ry); rz = snapAngleFine(rz)
      }
      rx = snapRightAngles(rx); ry = snapRightAngles(ry); rz = snapRightAngles(rz)
      updates.rotationX = rx
      updates.rotationY = ry
      updates.rotationZ = rz
    }
    if (Object.keys(updates).length) onUpdatePartLive(part.uid, updates)
    prevMatrixRef.current = localMatrix.clone()
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!lastMatrix.current) return
    const updates: Partial<AircraftPart> = {}
    updates.x = snapPos(part.x || 0)
    updates.y = snapPos(part.y || 0)
    updates.z = snapPos(part.z || 0)
    updates.rotationX = snapAngleFine(part.rotationX || 0)
    updates.rotationY = snapAngleFine(part.rotationY || 0)
    updates.rotationZ = snapAngleFine(part.rotationZ || 0)
    if (Object.keys(updates).length) onUpdatePart(part.uid, updates)
    lastMatrix.current = null
    setGizmoKey(k => k + 1)
    draggingRef.current = false
    prevMatrixRef.current = null
    onTransformEnd?.()
  }, [part, onUpdatePart])

  if (!isSelected) {
    return (
      <AircraftPartMesh
        key={part.uid}
        part={part}
        isSelected={false}
        isHovered={hoveredId === part.uid}
        onSelect={onSelect}
        onHover={() => {}}
        onUnhover={() => {}}
      />
    )
  }
  const centerX = (Number(part.x) || 0) + (Math.max(0.001, Number(part.w) || 1)) / 2
  const centerY = (Number(part.y) || 0) + (Math.max(0.001, Number(part.h) || 1)) / 2
  const centerZ = (Number(part.z) || 0) + (Math.max(0.001, Number(part.d) || 1)) / 2
  useFrame((_, dt) => {
    const maxDim = Math.max(Number(part.w) || 1, Number(part.h) || 1, Number(part.d) || 1)
    const center = new THREE.Vector3(centerX, centerY, centerZ)
    const dist = center.distanceTo(camera.position)
    const target = THREE.MathUtils.clamp(maxDim * 0.5 + dist * 0.03, 0.6, 12)
    setGizmoScale((s) => THREE.MathUtils.lerp(s, target, Math.min(1, 8 * dt)))
  })
  return (
    <>
      {transformMode === "rotate" ? (
        <RotationGizmo
          center={[centerX, centerY, centerZ]}
          scale={gizmoScale}
          onStart={() => onTransformStart?.()}
          onRotate={(axis, deltaRad) => {
            const baseEuler = new THREE.Euler(
              THREE.MathUtils.degToRad(Number(part.rotationX) || 0),
              THREE.MathUtils.degToRad(Number(part.rotationY) || 0),
              THREE.MathUtils.degToRad(Number(part.rotationZ) || 0),
              "XYZ"
            )
            const deltaEuler = new THREE.Euler(
              axis === "x" ? deltaRad * ROTATE_GAIN : 0,
              axis === "y" ? deltaRad * ROTATE_GAIN : 0,
              axis === "z" ? deltaRad * ROTATE_GAIN : 0,
              "XYZ"
            )
            const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler)
            const gainQuat = new THREE.Quaternion().setFromEuler(deltaEuler, "XYZ")
            baseQuat.premultiply(gainQuat)
            const outEuler = new THREE.Euler().setFromQuaternion(baseQuat, "XYZ")
            const rx = snapRightAngles(THREE.MathUtils.radToDeg(outEuler.x))
            const ry = snapRightAngles(THREE.MathUtils.radToDeg(outEuler.y))
            const rz = snapRightAngles(THREE.MathUtils.radToDeg(outEuler.z))
            onUpdatePartLive?.(part.uid, {
              rotationX: rx,
              rotationY: ry,
              rotationZ: rz,
            })
          }}
          onEnd={() => {
            const updates: Partial<AircraftPart> = {
              rotationX: snapRightAngles(snapAngleFine(part.rotationX || 0)),
              rotationY: snapRightAngles(snapAngleFine(part.rotationY || 0)),
              rotationZ: snapRightAngles(snapAngleFine(part.rotationZ || 0)),
            }
            onUpdatePart(part.uid, updates)
            onTransformEnd?.()
          }}
          currentAngles={{ x: Number(part.rotationX || 0), y: Number(part.rotationY || 0), z: Number(part.rotationZ || 0) }}
          onSetAngle={(axis, deg) => {
            const updates: Partial<AircraftPart> = {}
            if (axis === "x") updates.rotationX = snapAngleFine(deg)
            if (axis === "y") updates.rotationY = snapAngleFine(deg)
            if (axis === "z") updates.rotationZ = snapAngleFine(deg)
            onUpdatePartLive?.(part.uid, updates)
          }}
        />
      ) : (
        <TransformControls
          mode="translate"
          showX
          showY
          showZ
          space="world"
          position={[centerX, centerY, centerZ]}
          onMouseDown={() => {
            if (!draggingRef.current) {
              draggingRef.current = true
              onTransformStart?.()
            }
          }}
          onMouseUp={() => {
            const updates: Partial<AircraftPart> = {
              x: snapPos(part.x || 0),
              y: snapPos(part.y || 0),
              z: snapPos(part.z || 0),
            }
            onUpdatePart(part.uid, updates)
            draggingRef.current = false
            onTransformEnd?.()
          }}
          onObjectChange={(obj) => {
            // obj is the internal object, use delta based on previous matrix
            const m = (obj as any).matrix as THREE.Matrix4
            if (!onUpdatePartLive) return
            if (!prevMatrixRef.current) {
              prevMatrixRef.current = m.clone()
              return
            }
            const invPrev = prevMatrixRef.current.clone().invert()
            const deltaMatrix = m.clone().multiply(invPrev)
            prevMatrixRef.current = m.clone()
            const pos = new THREE.Vector3()
            const quat = new THREE.Quaternion()
            const scl = new THREE.Vector3()
            deltaMatrix.decompose(pos, quat, scl)
            const updates: Partial<AircraftPart> = {}
            if (Math.abs(pos.x) > 0.0001) updates.x = (part.x || 0) + pos.x
            if (Math.abs(pos.y) > 0.0001) updates.y = (part.y || 0) + pos.y
            if (Math.abs(pos.z) > 0.0001) updates.z = (part.z || 0) + pos.z
            if (Object.keys(updates).length) onUpdatePartLive(part.uid, updates)
          }}
        >
          <group />
        </TransformControls>
      )}
      {wireMode ? (
        <WireframePart part={part} isSelected />
      ) : (
        <AircraftPartMesh
          key={part.uid}
          part={part}
          isSelected
          isHovered={hoveredId === part.uid}
          onSelect={onSelect}
          onHover={() => {}}
          onUnhover={() => {}}
        />
      )}
    </>
  )
}
function CameraController({ resetTrigger }: { resetTrigger: number }) {
  const { camera } = useThree()
  const prevReset = useRef(resetTrigger)

  useEffect(() => {
    camera.position.set(20, 15, 20)
    camera.lookAt(0, 0, 0)
  }, [camera])

  useFrame(() => {
    if (resetTrigger !== prevReset.current) {
      prevReset.current = resetTrigger
      camera.position.set(20, 15, 20)
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

export default function Viewer3D({
  parts,
  selectedIds,
  onSelectPart,
  onSelectIds,
  onRotateSelection,
  onTranslateSelection,
  onTransformStart,
  onTransformEnd,
  transformMode = "none",
  wireMode = false,
  showGrid = true,
  resetTrigger = 0,
  onUpdatePart,
  onUpdatePartLive,
}: {
  parts: (AircraftPart & { uid: string })[]
  selectedIds: string[]
  onSelectPart: (uid: string, multi: boolean) => void
  onSelectIds?: (ids: string[]) => void
  onRotateSelection?: (payload: { q: [number, number, number, number], center: [number, number, number] }) => void
  onTranslateSelection?: (delta: [number, number, number]) => void
  onTransformStart?: () => void
  onTransformEnd?: () => void
  transformMode?: "none" | "rotate" | "translate"
  wireMode?: boolean
  showGrid?: boolean
  resetTrigger?: number
  onUpdatePart?: (uid: string, updates: Partial<AircraftPart>) => void
  onUpdatePartLive?: (uid: string, updates: Partial<AircraftPart>) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isTransforming, setIsTransforming] = useState(false)
  const isTransformingRef = useRef(false)
  const [viewerKey, setViewerKey] = useState(0)
  const [contextLost, setContextLost] = useState(false)
  const [selectionRect, setSelectionRect] = useState<{
    active: boolean
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const transformRef = useRef<THREE.Object3D>(null)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const prevQuatRef = useRef(new THREE.Quaternion())
  const prevPosRef = useRef(new THREE.Vector3())
  const effectiveTransformMode = useMemo(() => {
    if (transformMode === "rotate" && !onRotateSelection) return "none"
    if (transformMode === "translate" && !onTranslateSelection) return "none"
    return transformMode
  }, [transformMode, onRotateSelection, onTranslateSelection])

  const selectionCenter = useMemo(() => {
    const selected = parts.filter((p) => selectedIds.includes(p.uid))
    if (!selected.length) return new THREE.Vector3(0, 0, 0)
    const sum = selected.reduce(
      (acc, part) => {
        const w = Math.max(0.001, Number(part.w) || 1)
        const h = Math.max(0.001, Number(part.h) || 1)
        const d = Math.max(0.001, Number(part.d) || 1)
        const px = Number(part.x) || 0
        const py = Number(part.y) || 0
        const pz = Number(part.z) || 0
        acc.x += px + w / 2
        acc.y += py + h / 2
        acc.z += pz + d / 2
        return acc
      },
      { x: 0, y: 0, z: 0 }
    )
    return new THREE.Vector3(sum.x / selected.length, sum.y / selected.length, sum.z / selected.length)
  }, [parts, selectedIds])

  const handleHover = useCallback((uid: string) => setHoveredId(uid), [])
  const handleUnhover = useCallback(() => setHoveredId(null), [])
  const handlePointerDown = useCallback((e: any) => {
    if (!onSelectIds) return
    if (e?.button !== 0) {
      return
    }
    if (e?.altKey) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      e.preventDefault()
      setSelectionRect({ active: true, startX: x, startY: y, endX: x, endY: y })
      return
    }
  }, [onSelectIds])

  const handlePointerMove = useCallback((e: any) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (selectionRect?.active) {
      setSelectionRect((prev) => prev ? { ...prev, endX: x, endY: y } : prev)
      return
    }
  }, [selectionRect, onRotateSelection, onTranslateSelection, selectionCenter])

  const handlePointerUp = useCallback(() => {
    if (!selectionRect?.active || !onSelectIds) return
    const rect = containerRef.current?.getBoundingClientRect()
    const camera = cameraRef.current
    if (!rect || !camera) {
      setSelectionRect(null)
      return
    }
    const minX = Math.min(selectionRect.startX, selectionRect.endX)
    const maxX = Math.max(selectionRect.startX, selectionRect.endX)
    const minY = Math.min(selectionRect.startY, selectionRect.endY)
    const maxY = Math.max(selectionRect.startY, selectionRect.endY)
    const width = rect.width
    const height = rect.height
    const selected = parts.filter((part) => {
      const w = Math.max(0.001, Number(part.w) || 1)
      const h = Math.max(0.001, Number(part.h) || 1)
      const d = Math.max(0.001, Number(part.d) || 1)
      const px = Number(part.x) || 0
      const py = Number(part.y) || 0
      const pz = Number(part.z) || 0
      const center = new THREE.Vector3(px + w / 2, py + h / 2, pz + d / 2)
      center.project(camera)
      const sx = ((center.x + 1) / 2) * width
      const sy = ((1 - center.y) / 2) * height
      return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY
    }).map((p) => p.uid)
    onSelectIds(selected)
    setSelectionRect(null)
  }, [selectionRect, onSelectIds, parts])

  useEffect(() => {
    if (!transformRef.current || isTransformingRef.current) return
    transformRef.current.position.copy(selectionCenter)
    transformRef.current.quaternion.identity()
    prevQuatRef.current.identity()
    prevPosRef.current.copy(selectionCenter)
  }, [selectionCenter])

  const handleTransformStart = useCallback(() => {
    if (!transformRef.current) return
    prevQuatRef.current.copy(transformRef.current.quaternion)
    prevPosRef.current.copy(transformRef.current.position)
    isTransformingRef.current = true
    setIsTransforming(true)
    onTransformStart?.()
  }, [onTransformStart])

  const handleTransformEnd = useCallback(() => {
    isTransformingRef.current = false
    setIsTransforming(false)
    onTransformEnd?.()
  }, [onTransformEnd])

  const handleTransformChange = useCallback(() => {
    if (!transformRef.current) return
    if (effectiveTransformMode === "rotate" && onRotateSelection) {
      const current = transformRef.current.quaternion.clone()
      const delta = current.clone().multiply(prevQuatRef.current.clone().invert())
      prevQuatRef.current.copy(current)
      onRotateSelection({
        q: [delta.x, delta.y, delta.z, delta.w],
        center: [selectionCenter.x, selectionCenter.y, selectionCenter.z],
      })
    }
    if (effectiveTransformMode === "translate" && onTranslateSelection) {
      const current = transformRef.current.position.clone()
      const delta = current.clone().sub(prevPosRef.current)
      prevPosRef.current.copy(current)
      onTranslateSelection([delta.x, delta.y, delta.z])
    }
  }, [onRotateSelection, onTranslateSelection, selectionCenter, effectiveTransformMode])

  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    const handleLost = (event: Event) => {
      event.preventDefault()
      setContextLost(true)
    }
    const handleRestored = () => {
      setContextLost(false)
      setViewerKey((k) => k + 1)
    }
    gl.domElement.addEventListener("webglcontextlost", handleLost)
    gl.domElement.addEventListener("webglcontextrestored", handleRestored)
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", handleLost)
      gl.domElement.removeEventListener("webglcontextrestored", handleRestored)
    }
  }, [viewerKey])

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <ViewerErrorBoundary
        key={viewerKey}
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
            <div className="text-center space-y-3">
              <div className="text-xl">:(</div>
              <div className="text-xs text-slate-300">Falha ao iniciar o viewport 3D.</div>
              <button
                className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                onClick={() => setViewerKey((k) => k + 1)}
              >
                Recarregar 3D
              </button>
            </div>
          </div>
        }
      >
        <Canvas
          key={viewerKey}
          camera={{ position: [20, 15, 20], fov: 50 }}
          onPointerMissed={(e) => {
            if (selectionRect?.active || e?.altKey) return
            onSelectPart("", false)
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onCreated={({ gl, camera }) => {
            cameraRef.current = camera
            glRef.current = gl
            gl.setClearColor(new THREE.Color("#0b0f14"), 1)
          }}
          onContextMenu={(e) => e.preventDefault()}
          gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        >
          <CameraController resetTrigger={resetTrigger} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={0.3} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />

          <Environment preset="studio" />

          {showGrid && (
            <Grid
              args={[100, 100]}
              position={[0, -5, 0]}
              cellSize={2}
              cellThickness={0.5}
              cellColor="#374151"
              sectionSize={10}
              sectionThickness={1}
              sectionColor="#4B5563"
              fadeDistance={80}
              infiniteGrid
            />
          )}

          <AxisHelper />
          <OrientationHelpers />

          {parts.map((part) => {
            const isSelected = selectedIds.includes(part.uid)
            if (isSelected && onUpdatePart) {
              return (
                <PartWithGizmo
                  key={part.uid}
                  part={part}
                  isSelected
                  hoveredId={hoveredId}
                  onSelect={onSelectPart}
                  transformMode={transformMode}
                  onUpdatePart={onUpdatePart}
                  onUpdatePartLive={onUpdatePartLive}
                  onTransformStart={() => { setIsTransforming(true); onTransformStart?.() }}
                  onTransformEnd={() => { setIsTransforming(false); onTransformEnd?.() }}
                  wireMode={wireMode}
                />
              )
            }
            if (wireMode) {
              return <WireframePart key={part.uid} part={part} isSelected={isSelected} />
            }
            return (
              <AircraftPartMesh
                key={part.uid}
                part={part}
                isSelected={isSelected}
                isHovered={hoveredId === part.uid}
                onSelect={onSelectPart}
                onHover={handleHover}
                onUnhover={handleUnhover}
              />
            )
          })}

          {/* TransformControls removidos em favor de PivotControls por peça */}

          <OrbitControls
            makeDefault
            enableDamping
            enabled={!selectionRect?.active && !isTransforming}
            dampingFactor={0.1}
            minDistance={5}
            maxDistance={100}
          />

          <GizmoHelper alignment="bottom-left" margin={[90, 90]}>
            <GizmoViewport
              axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
              labelColor="#e2e8f0"
              hideNegativeAxes={false}
              axisHeadScale={1.1}
              labelFontSize={12}
            />
          </GizmoHelper>
          <GizmoHelper alignment="top-right" margin={[90, 90]}>
            <GizmoViewcube
              size={90}
              strokeColor="#0f172a"
              color="#0b1220"
              hoverColor="#1e293b"
              textColor="#e2e8f0"
            />
          </GizmoHelper>
        </Canvas>
      </ViewerErrorBoundary>

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white">
          <div className="text-center space-y-3">
            <div className="text-xl">WebGL pausado</div>
            <div className="text-xs text-slate-300">O navegador perdeu o contexto 3D.</div>
            <button
              className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
              onClick={() => {
                setContextLost(false)
                setViewerKey((k) => k + 1)
              }}
            >
              Recarregar 3D
            </button>
          </div>
        </div>
      )}

      {selectionRect?.active && (
        <div
          className="absolute border border-blue-400/80 bg-blue-500/10"
          style={{
            left: Math.min(selectionRect.startX, selectionRect.endX),
            top: Math.min(selectionRect.startY, selectionRect.endY),
            width: Math.abs(selectionRect.endX - selectionRect.startX),
            height: Math.abs(selectionRect.endY - selectionRect.startY),
          }}
        />
      )}

      {hoveredId && (
        <div className="absolute bottom-3 left-3 bg-card/90 text-card-foreground text-xs px-3 py-1.5 rounded-md border border-border backdrop-blur-sm">
          {parts.find((p) => p.uid === hoveredId)?.label || ""}
        </div>
      )}
      {parts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs text-slate-400">Selecione uma aeronave para visualizar</div>
        </div>
      )}
    </div>
  )
}
