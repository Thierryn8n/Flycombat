"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { AircraftPart } from "@/lib/aircraft-database"

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

export function PartMesh({ part }: { part: AircraftPart }) {
  const opacity = part.opacity ?? 1.0
  const isTransparent = opacity < 1 || part.type === "canopy" || part.type === "cockpit"

  const w = Math.max(0.001, Number(part.w) || 1)
  const h = Math.max(0.001, Number(part.h) || 1)
  const d = Math.max(0.001, Number(part.d) || 1)

  const centerX = part.x + w / 2
  const centerY = part.y + h / 2
  const centerZ = part.z + d / 2

  const type = geometryType(part)

  const rotation = [
    ((part.rotationX || 0) * Math.PI) / 180,
    ((part.rotationY || 0) * Math.PI) / 180,
    ((part.rotationZ || 0) * Math.PI) / 180,
  ] as [number, number, number]

  const materialProps = {
    color: part.color,
    transparent: isTransparent,
    opacity,
    metalness: 0.4,
    roughness: 0.5,
  }

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
      return applyTipDeform(geo, part)
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
      return geo
    }
    if (type === "seat") {
      const geo = new THREE.BoxGeometry(w, h, d)
      geo.center()
      return geo
    }
    const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2)
    geo.center()
    return applyTipDeform(geo, part)
  }, [type, w, h, d, part])

  return (
    <mesh position={[centerX, centerY, centerZ]} rotation={rotation} geometry={geometry}>
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
