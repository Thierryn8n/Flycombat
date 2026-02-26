"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getGuestPoints, setGuestPoints } from "@/lib/guest-storage"

const GameSceneDynamic = dynamic(
  () => import("@/components/game/game-scene").then((m) => ({ default: m.GameScene })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">FlyCAD Battle Royale</h2>
            <p className="text-sm text-muted-foreground mt-1">Carregando mundo...</p>
          </div>
        </div>
      </div>
    )
  }
)

export default function PlayPage() {
  const router = useRouter()
  const [aircraftColor, setAircraftColor] = useState<string>("#64748b")
  const [aircraftName, setAircraftName] = useState<string>("Aeronave")
  const [baseSpeed, setBaseSpeed] = useState<number>(500)
  const [baseHp, setBaseHp] = useState<number>(100)
  const [baseHandling, setBaseHandling] = useState<number>(60)
  const [autoAimLevel, setAutoAimLevel] = useState<number>(0)
  const [ready, setReady] = useState(false)
  const [aircraftId, setAircraftId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const statsRaw = localStorage.getItem("selected_aircraft_stats")
      const colorRaw = localStorage.getItem("selected_aircraft_color")
      const idRaw = localStorage.getItem("selected_aircraft_id")
      const upgradesRaw = localStorage.getItem("selected_aircraft_upgrades")
      
      if (colorRaw) setAircraftColor(colorRaw)
      if (idRaw) {
        setAircraftId(idRaw)
        setAircraftName(`Aeronave ${idRaw.slice(0, 4).toUpperCase()}`)
      }
      if (upgradesRaw) {
        try {
          const u = JSON.parse(upgradesRaw)
          setAutoAimLevel(Number(u.autoaim) || 0)
        } catch {}
      }
      if (statsRaw) {
        const s = JSON.parse(statsRaw) as { speed?: number; health?: number; damage?: number; armor?: number }
        if (typeof s.speed === "number") setBaseSpeed(s.speed)
        if (typeof s.health === "number") setBaseHp(s.health)
        if (typeof s.armor === "number") setBaseHandling(Math.max(30, Math.min(100, Math.floor(50 + s.armor * 0.1))))
      }
    } catch {}
    setReady(true)
  }, [])

  async function handleGameEnd(points: number, kills: number) {
    try {
      try {
        localStorage.setItem("pending_match_points", String(Math.floor(points)))
        localStorage.setItem("pending_match_kills", String(Math.floor(kills)))
      } catch {}
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch current totals
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_points,total_kills,games_played")
          .eq("id", user.id)
          .single()
        const tp = (profile?.total_points || 0) + Math.max(0, Math.floor(points))
        const tk = (profile?.total_kills || 0) + Math.max(0, Math.floor(kills))
        const gp = (profile?.games_played || 0) + 1
        await supabase
          .from("profiles")
          .update({ total_points: tp, total_kills: tk, games_played: gp })
          .eq("id", user.id)
        try {
          localStorage.removeItem("pending_match_points")
          localStorage.removeItem("pending_match_kills")
          localStorage.setItem("last_match_points", String(Math.floor(points)))
          localStorage.setItem("last_match_kills", String(Math.floor(kills)))
        } catch {}
      } else {
        const prev = getGuestPoints()
        setGuestPoints(prev + Math.max(0, Math.floor(points)))
        try {
          localStorage.setItem("last_match_points", String(Math.floor(points)))
          localStorage.setItem("last_match_kills", String(Math.floor(kills)))
        } catch {}
      }
    } catch {}
    router.push("/hangar")
  }

  if (!ready) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">FlyCAD Battle Royale</h2>
            <p className="text-sm text-muted-foreground mt-1">Inicializando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <GameSceneDynamic
      aircraftColor={aircraftColor}
      aircraftName={aircraftName}
      baseSpeed={baseSpeed}
      baseHp={baseHp}
      baseHandling={baseHandling}
      autoAimLevel={autoAimLevel}
      onGameEnd={handleGameEnd}
    />
  )
}
