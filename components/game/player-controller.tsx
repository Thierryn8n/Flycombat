"use client"

import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { AirplaneModel } from "./airplane"
import { PartMesh } from "./part-mesh"
import type { AircraftPart } from "@/lib/aircraft-database"
import { GAME_CONFIG } from "@/lib/game/types"
import { getTerrainHeight, getObstacles, getTrees } from "./world"
import { setEnginePitch } from "@/lib/game/sounds"
import type { LocalPlayer } from "@/lib/game/store"

interface PlayerControllerProps {
  player: LocalPlayer
  onUpdate: (position: [number, number, number], rotation: [number, number, number]) => void
  onShoot: () => void
  onTerrainCollision?: () => void
  onCrash?: (position: [number, number, number]) => void
  phase: "waiting" | "countdown" | "active" | "finished"
  parts?: AircraftPart[]
}

const keys = new Set<string>()

// Cache obstacle/tree colliders
let _colliders: { x: number; z: number; y: number; r: number; h: number }[] | null = null
function getColliders() {
  if (_colliders) return _colliders
  const obs = getObstacles()
  const trees = getTrees()
  _colliders = [
    ...obs.map(o => ({ x: o.position[0], z: o.position[2], y: o.position[1], r: o.radius, h: o.height })),
    ...trees.map(t => ({ x: t.position[0], z: t.position[2], y: t.position[1] + 5, r: t.radius, h: 12 })),
  ]
  return _colliders
}

export function PlayerController({ player, onUpdate, onShoot, onTerrainCollision, onCrash, phase, parts }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const rollRef = useRef(0)
  const groundSpeedRef = useRef(0)
  const airborneRef = useRef(false)
  const lastShot = useRef(0)
  const lastCollisionDmg = useRef(0)
  const { camera } = useThree()

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.add(e.code)
      if (e.code === "Space") e.preventDefault()
      if (e.code === "Digit1") window.dispatchEvent(new CustomEvent("flygold-weapon", { detail: "missile" }))
      if (e.code === "Digit2") window.dispatchEvent(new CustomEvent("flygold-weapon", { detail: "emp" }))
      if (e.code === "Digit3") window.dispatchEvent(new CustomEvent("flygold-weapon", { detail: "mine" }))
    }
    const onUp = (e: KeyboardEvent) => keys.delete(e.code)
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp) }
  }, [])

  // Touch controls
  const touchRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, shooting: false })
  useEffect(() => {
    const onTS = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t.clientX > window.innerWidth / 2) touchRef.current.shooting = true
      else { touchRef.current.active = true; touchRef.current.startX = t.clientX; touchRef.current.startY = t.clientY }
    }
    const onTM = (e: TouchEvent) => {
      if (!touchRef.current.active) return
      const t = e.touches[0]
      touchRef.current.dx = (t.clientX - touchRef.current.startX) / window.innerWidth
      touchRef.current.dy = (t.clientY - touchRef.current.startY) / window.innerHeight
    }
    const onTE = () => { touchRef.current.active = false; touchRef.current.dx = 0; touchRef.current.dy = 0; touchRef.current.shooting = false }
    window.addEventListener("touchstart", onTS, { passive: true })
    window.addEventListener("touchmove", onTM, { passive: true })
    window.addEventListener("touchend", onTE, { passive: true })
    return () => { window.removeEventListener("touchstart", onTS); window.removeEventListener("touchmove", onTM); window.removeEventListener("touchend", onTE) }
  }, [])

  // Camera initial setup
  useEffect(() => {
    if (groupRef.current) {
      const pos = groupRef.current.position
      const behind = new THREE.Vector3(0, 6, 18)
      camera.position.set(pos.x + behind.x, pos.y + behind.y, pos.z + behind.z)
      camera.lookAt(pos)
    }
  }, [camera])

  useFrame((_, delta) => {
    if (!groupRef.current || !player.alive) return
    const pos = groupRef.current.position
    const dt = Math.min(delta, 0.05)
    const terrainH = getTerrainHeight(pos.x, pos.z)

    // ---- Stunned: just keep flying forward ----
    if (player.stunned && Date.now() < player.stunnedUntil) {
      const euler = new THREE.Euler(pitchRef.current, yawRef.current, rollRef.current, "YXZ")
      const quat = new THREE.Quaternion().setFromEuler(euler)
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)
      const camOff = new THREE.Vector3(0, 5, 16).applyQuaternion(quat)
      const tgt = pos.clone().add(camOff)
      camera.position.lerp(tgt, 6 * dt)
      camera.lookAt(pos.clone().add(fwd.multiplyScalar(20)))
      onUpdate([pos.x, pos.y, pos.z], [pitchRef.current, yawRef.current, rollRef.current])
      return
    }

    // ---- Waiting / Countdown: sit on runway ----
    if (phase === "waiting" || phase === "countdown") {
      pos.y = terrainH + 1.2
      // Auto-align to runway centerline for clean takeoff
      pos.x = THREE.MathUtils.lerp(pos.x, 0, 4 * dt)
      yawRef.current = THREE.MathUtils.lerp(yawRef.current, 0, 3 * dt)
      const euler = new THREE.Euler(0, 0, 0, "YXZ")
      const quat = new THREE.Quaternion().setFromEuler(euler)
      const behind = new THREE.Vector3(0, 5, 16).applyQuaternion(quat)
      const tgt = pos.clone().add(behind)
      camera.position.lerp(tgt, 4 * dt)
      camera.lookAt(pos.clone().add(new THREE.Vector3(0, 1, -10)))
      onUpdate([pos.x, pos.y, pos.z], [0, 0, 0])
      return
    }

    // ---- Active phase ----
    const handling = player.handling / 100
    const speedMult = player.speed / 80
    const turnRate = 1.8 * handling
    const pitchRate = 1.5 * handling

    let inputYaw = 0, inputPitch = 0, throttle = 1
    if (keys.has("KeyA") || keys.has("ArrowLeft")) inputYaw = 1
    if (keys.has("KeyD") || keys.has("ArrowRight")) inputYaw = -1
    if (keys.has("KeyW") || keys.has("ArrowUp")) inputPitch = -1
    if (keys.has("KeyS") || keys.has("ArrowDown")) inputPitch = 1
    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) throttle = 1.6
    if (touchRef.current.active) { inputYaw = -touchRef.current.dx * 3; inputPitch = touchRef.current.dy * 3 }
    setEnginePitch(throttle)

    // ---- Takeoff physics ----
    const onGround = pos.y < terrainH + 2.5 && !airborneRef.current
    if (onGround) {
      // Accelerate on ground
      groundSpeedRef.current += throttle * 25 * dt
      groundSpeedRef.current = Math.min(groundSpeedRef.current, 50 * speedMult)
      // Move forward on runway (Z direction)
      pos.z -= groundSpeedRef.current * dt
      pos.y = terrainH + 1.2
      // Slight steering on ground
      yawRef.current += inputYaw * 0.5 * dt

      // Lift off when fast enough
      if (groundSpeedRef.current > 30 * speedMult && (inputPitch < 0 || groundSpeedRef.current > 40 * speedMult)) {
        airborneRef.current = true
      }

      groupRef.current.rotation.set(0, yawRef.current, 0)
      const camPos = new THREE.Vector3(pos.x, pos.y + 5, pos.z + 16)
      camera.position.lerp(camPos, 6 * dt)
      camera.lookAt(pos.clone().add(new THREE.Vector3(0, 1, -20)))
      onUpdate([pos.x, pos.y, pos.z], [0, yawRef.current, 0])

      // Shooting on ground still works
      const shooting = keys.has("Space") || touchRef.current.shooting
      if (shooting && Date.now() - lastShot.current > GAME_CONFIG.FIRE_RATE) { lastShot.current = Date.now(); onShoot() }
      return
    }

    // Mark as airborne
    airborneRef.current = true

    // ---- Airborne flight ----
    yawRef.current += inputYaw * turnRate * dt
    pitchRef.current += inputPitch * pitchRate * dt
    pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, -Math.PI / 3, Math.PI / 3)
    const targetRoll = -inputYaw * 0.5
    rollRef.current = THREE.MathUtils.lerp(rollRef.current, targetRoll, 5 * dt)

    const euler = new THREE.Euler(pitchRef.current, yawRef.current, rollRef.current, "YXZ")
    const quat = new THREE.Quaternion().setFromEuler(euler)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)

    const currentSpeed = 40 * speedMult * throttle
    velocityRef.current.copy(forward).multiplyScalar(currentSpeed)

    const newX = pos.x + velocityRef.current.x * dt
    const newY = pos.y + velocityRef.current.y * dt
    const newZ = pos.z + velocityRef.current.z * dt

    // ---- Obstacle collision ----
    const colliders = getColliders()
    let blocked = false
    for (const col of colliders) {
      const dx = newX - col.x, dz = newZ - col.z
      const hDist = Math.sqrt(dx * dx + dz * dz)
      const vDist = Math.abs(newY - col.y)
      if (hDist < col.r + 3 && vDist < col.h / 2 + 3) {
        blocked = true
        const now = Date.now()
        if (now - lastCollisionDmg.current > 400) {
          lastCollisionDmg.current = now
          onTerrainCollision?.()
          // Crash if going fast
          if (currentSpeed > 35) {
            onCrash?.([newX, newY, newZ])
          }
        }
        // Push away
        const pushAngle = Math.atan2(dz, dx)
        pos.x = col.x + Math.cos(pushAngle) * (col.r + 4)
        pos.z = col.z + Math.sin(pushAngle) * (col.r + 4)
        velocityRef.current.multiplyScalar(-0.2)
        break
      }
    }

    if (!blocked) { pos.x = newX; pos.y = newY; pos.z = newZ }

    // ---- Terrain collision ----
    const minClear = 2.0
    if (pos.y < terrainH + minClear) {
      const impactV = Math.abs(velocityRef.current.y)
      if (pos.y < terrainH + 0.5) {
        const now = Date.now()
        if (now - lastCollisionDmg.current > 400) {
          lastCollisionDmg.current = now
          if (impactV > 8 || currentSpeed > 30) {
            onCrash?.([pos.x, terrainH, pos.z])
          } else {
            onTerrainCollision?.()
          }
        }
      }
      pos.y = terrainH + minClear
      if (velocityRef.current.y < 0) velocityRef.current.y *= -0.3
      pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, -0.15, 3 * dt)
    }
    pos.y = THREE.MathUtils.clamp(pos.y, terrainH + minClear, GAME_CONFIG.MAX_ALTITUDE)

    // ---- World bounds ----
    const maxDist = GAME_CONFIG.WORLD_SIZE * 0.48
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
    if (dist > maxDist) {
      const a = Math.atan2(pos.z, pos.x)
      pos.x = Math.cos(a) * maxDist; pos.z = Math.sin(a) * maxDist
    }

    groupRef.current.quaternion.copy(quat)

    // ---- Camera ----
    const camOff = new THREE.Vector3(0, 5, 16).applyQuaternion(quat)
    const tgtCam = pos.clone().add(camOff)
    const camTH = getTerrainHeight(tgtCam.x, tgtCam.z)
    if (tgtCam.y < camTH + 3) tgtCam.y = camTH + 3
    camera.position.lerp(tgtCam, 7 * dt)
    camera.lookAt(pos.clone().add(forward.multiplyScalar(20)))

    // ---- Shooting ----
    const shooting = keys.has("Space") || touchRef.current.shooting
    if (shooting && Date.now() - lastShot.current > GAME_CONFIG.FIRE_RATE) { lastShot.current = Date.now(); onShoot() }

    onUpdate([pos.x, pos.y, pos.z], [pitchRef.current, yawRef.current, rollRef.current])
  })

  return (
    <group ref={groupRef} position={player.position}>
      {parts && parts.length > 0 ? (
        <group>
          {parts.map((p, idx) => (
            <PartMesh key={(p.uid || p.id) + "-" + idx} part={p} />
          ))}
        </group>
      ) : (
        <AirplaneModel color={player.aircraftColor} isPlayer />
      )}
    </group>
  )
}
