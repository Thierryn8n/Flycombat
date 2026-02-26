"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Plane, Gamepad2, Moon, Sun, Coins, Trophy, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email, id: data.user.id })
    })
  }, [])

  if (!mounted) return null

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_60%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.06)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="h-full w-full flex flex-row items-stretch">
        <div className="flex-1 px-8 py-6 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                <Plane className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight">FlyCAD Battle</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Air Combat Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              {user ? (
                <>
                  <Button size="sm" asChild className="bg-orange-600 hover:bg-orange-500">
                    <Link href="/play">Jogar</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" asChild className="bg-orange-600 hover:bg-orange-500">
                    <Link href="/hangar">Jogar sem login</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/auth/login">Entrar</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="max-w-xl">
              <h2 className="text-5xl font-black tracking-tight">Combate aéreo em 3D</h2>
              <p className="mt-4 text-slate-300">
                Decole agora e entre em combates aéreos intensos. Escolha sua aeronave e jogue sem demora.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Button size="lg" asChild className="bg-orange-600 hover:bg-orange-500">
                  <Link href="/hangar">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Entrar no Hangar
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/flygold">
                    <Coins className="w-4 h-4 mr-2" />
                    Comprar FlyGold
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-[520px] px-8 py-6 border-l border-orange-500/20 bg-black">
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard icon={<Plane className="w-6 h-6" />} title="Hangar 3D" description="Visualize e inspecione sua aeronave em 3D com estilo gamer." />
            <FeatureCard icon={<Gamepad2 className="w-6 h-6" />} title="Battle Royale" description="Combate arcade com bônus, obstáculos e pista de pouso." />
            <FeatureCard icon={<Coins className="w-6 h-6" />} title="Progresso" description="Ganhe pontos jogando e evolua seus equipamentos." />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6 text-center">
            <StatCard icon={<Plane className="w-5 h-5" />} value="6+" label="Aeronaves" />
            <StatCard icon={<Users className="w-5 h-5" />} value="50+" label="Jogadores/Sala" />
            <StatCard icon={<Trophy className="w-5 h-5" />} value="Bônus" label="Colete e turbine seu voo" />
            <StatCard icon={<Coins className="w-5 h-5" />} value="Mapa" label="Runway, nuvens e obstáculos" />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
