"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Sky } from "@react-three/drei"
import * as THREE from "three"
import { Cockpit3D } from "@/components/game/cockpit"

function CameraRig({ getTelemetry }: { getTelemetry: () => { roll: number; pitch: number } }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 1.0, -2.2))
  useFrame((_, dt) => {
    const t = getTelemetry()
    const e = new THREE.Euler(t.pitch, 0, t.roll, "YXZ")
    const q = new THREE.Quaternion().setFromEuler(e)
    const eye = new THREE.Vector3(0, 1.25, 1.0).applyQuaternion(q)
    const look = target.current.clone().applyQuaternion(q)
    camera.position.lerp(eye, 10 * dt)
    camera.lookAt(look)
  })
  return null
}

export default function CockpitPage() {
  const [speed, setSpeed] = useState(420)
  const [altitude, setAltitude] = useState(1500)
  const [score, setScore] = useState(12450)
  const [radarScore, setRadarScore] = useState(850)
  const rollRef = useRef(0)
  const pitchRef = useRef(0)
  const yawRef = useRef(0)
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp") setSpeed((v) => Math.min(900, v + 10))
      if (e.code === "ArrowDown") setSpeed((v) => Math.max(0, v - 10))
      if (e.code === "PageUp") setAltitude((v) => v + 50)
      if (e.code === "PageDown") setAltitude((v) => Math.max(0, v - 50))
      if (e.code === "KeyQ") rollRef.current = Math.min(1.2, rollRef.current + 0.05)
      if (e.code === "KeyE") rollRef.current = Math.max(-1.2, rollRef.current - 0.05)
      if (e.code === "KeyR") pitchRef.current = Math.max(-0.6, pitchRef.current - 0.03)
      if (e.code === "KeyF") pitchRef.current = Math.min(0.6, pitchRef.current + 0.03)
      if (e.code === "KeyA") yawRef.current = Math.min(1.2, yawRef.current + 0.05)
      if (e.code === "KeyD") yawRef.current = Math.max(-1.2, yawRef.current - 0.05)
      if (e.code === "KeyS") setScore((v) => Math.min(99999, v + 100))
      if (e.code === "KeyX") setScore((v) => Math.max(0, v - 100))
      if (e.code === "KeyW") setRadarScore((v) => Math.min(9999, v + 50))
      if (e.code === "KeyZ") setRadarScore((v) => Math.max(0, v - 50))
    }
    window.addEventListener("keydown", kd)
    return () => window.removeEventListener("keydown", kd)
  }, [])
  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
        <div className="text-xs text-slate-300">Setas Velocidade | PgUp/PgDn Altitude | Q/E Roll | R/F Pitch | A/D Yaw | S/X Score | W/Z Radar Score</div>
      </div>
      <Canvas camera={{ fov: 60, near: 0.1, far: 2000, position: [0, 1.25, 1.0] }} dpr={[1, 1]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[20, 40, 10]} intensity={1.3} />
        <directionalLight position={[-20, 30, -10]} intensity={0.8} />
        <pointLight position={[0, 1.2, -0.2]} intensity={1.2} color="#7dd3fc" distance={6} />
        <Sky sunPosition={[100, 50, 100]} turbidity={4} />
        <mesh position={[0, -0.1, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#0b1220" />
        </mesh>
        <group position={[0, 0.05, -1.2]} scale={1.35}>
          <Cockpit3D
            getTelemetry={() => ({
              speed,
              altitude,
              roll: rollRef.current,
              pitch: pitchRef.current,
              yaw: yawRef.current,
              score,
              radarScore,
            })}
          />
        </group>
        <CameraRig getTelemetry={() => ({ roll: rollRef.current, pitch: pitchRef.current })} />
      </Canvas>
    </div>
  )
}
