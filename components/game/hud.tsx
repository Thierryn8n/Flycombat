"use client"

import { Heart, Zap, Shield, Crosshair, Clock, Users, Trophy, Rocket, CircleDot, Bomb } from "lucide-react"
import type { LocalPlayer, KillFeedEntry, EnemyPlayer } from "@/lib/game/store"

interface HudProps {
  player: LocalPlayer
  phase: "waiting" | "countdown" | "active" | "finished"
  countdown: number
  matchTime: number
  playersAlive: number
  killFeed: KillFeedEntry[]
  onLeave: () => void
  onFireMissile: () => void
  onFireEMP: () => void
  onDeployMine: () => void
  enemies?: EnemyPlayer[]
}

export function GameHUD({ player, phase, countdown, matchTime, playersAlive, killFeed, onLeave, onFireMissile, onFireEMP, onDeployMine, enemies }: HudProps) {
  const hpPercent = (player.hp / player.maxHp) * 100
  const minutes = Math.floor(matchTime / 60)
  const seconds = matchTime % 60
  const headingDeg = (-player.rotation[1] * 180) / Math.PI

  if (phase === "waiting") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="text-center pointer-events-auto">
          <h2 className="text-3xl font-bold text-foreground mb-2">Aguardando Jogadores...</h2>
          <p className="text-muted-foreground">Preparando a arena</p>
          <button
            onClick={onLeave}
            className="mt-4 px-6 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium min-h-[44px]"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  if (phase === "countdown") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-6xl font-bold text-primary animate-pulse">{countdown}</p>
          <p className="text-xl text-foreground mt-2">Decolagem em...</p>
        </div>
      </div>
    )
  }

  if (phase === "finished") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="text-center bg-background/80 backdrop-blur-md rounded-xl p-8 pointer-events-auto">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Fim de Partida
          </h2>
          <p className="text-lg text-primary font-bold">{player.points.toLocaleString()} pontos</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Kills: {player.deaths > 0 ? "..." : "0"}</span>
            <span>Mortes: {player.deaths}</span>
          </div>
          <button
            onClick={onLeave}
            className="mt-6 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold min-h-[44px]"
          >
            Voltar ao Hangar
          </button>
        </div>
      </div>
    )
  }

  // Respawn overlay
  if (!player.alive && player.respawnTimer > 0) {
    const respawnSeconds = Math.ceil(player.respawnTimer / 1000)
    return (
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Still show top bar */}
        <TopBar matchTime={matchTime} playersAlive={playersAlive} points={player.points} minutes={minutes} seconds={seconds} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-background/60 backdrop-blur-sm rounded-xl p-6">
            <p className="text-2xl font-bold text-destructive mb-1">Eliminado</p>
            <p className="text-4xl font-bold text-foreground animate-pulse">{respawnSeconds}</p>
            <p className="text-sm text-muted-foreground mt-1">Respawn em...</p>
          </div>
        </div>
        {/* Kill feed */}
        <KillFeedDisplay killFeed={killFeed} />
        <LeaveButton onLeave={onLeave} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Top bar */}
      <TopBar matchTime={matchTime} playersAlive={playersAlive} points={player.points} minutes={minutes} seconds={seconds} />

      {/* HP bar + bonuses (bottom left) */}
      <div className="absolute bottom-14 left-3 sm:left-4">
        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-background/70 backdrop-blur-sm min-w-[140px]">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-mono text-foreground">{Math.round(player.hp)}/{player.maxHp}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#eab308" : "#ef4444",
              }}
            />
          </div>
          {/* Invulnerability indicator */}
          {player.invulnerable && (
            <div className="px-1.5 py-0.5 rounded text-xs font-mono bg-primary/20 text-primary animate-pulse">
              INVULNERAVEL
            </div>
          )}
          {/* Stun indicator */}
          {player.stunned && (
            <div className="px-1.5 py-0.5 rounded text-xs font-mono bg-yellow-500/20 text-yellow-400 animate-pulse">
              ATORDOADO
            </div>
          )}
          {/* Active bonuses */}
          {player.bonuses.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {player.bonuses.map((b, i) => {
                const remaining = Math.max(0, Math.ceil(b.remainingMs / 1000))
                return (
                  <div
                    key={i}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor:
                        b.type === "speed" ? "#3b82f620" : b.type === "resistance" ? "#8b5cf620" : "#22c55e20",
                      color: b.type === "speed" ? "#3b82f6" : b.type === "resistance" ? "#8b5cf6" : "#22c55e",
                    }}
                  >
                    {b.type === "speed" ? <Zap className="w-2.5 h-2.5" /> : b.type === "resistance" ? <Shield className="w-2.5 h-2.5" /> : <Heart className="w-2.5 h-2.5" />}
                    {remaining}s
                  </div>
                )
              })}
            </div>
          )}
          {/* Auto-aim tracking indicator */}
          {player.autoAimLevel > 0 && (
            <div className="flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">
              <Crosshair className="w-2.5 h-2.5" />
              {Math.min(100, Math.round((0.2 + 0.05 * player.autoAimLevel) * 100))}%
            </div>
          )}
        </div>
      </div>

      {/* Weapon inventory (bottom center) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/70 backdrop-blur-sm">
          <WeaponSlot
            icon={<Rocket className="w-4 h-4" />}
            count={player.missiles}
            label="Missil"
            color="#EF4444"
            onUse={onFireMissile}
            hotkey="1"
          />
          <WeaponSlot
            icon={<CircleDot className="w-4 h-4" />}
            count={player.emps}
            label="EMP"
            color="#F59E0B"
            onUse={onFireEMP}
            hotkey="2"
          />
          <WeaponSlot
            icon={<Bomb className="w-4 h-4" />}
            count={player.mines}
            label="Mina"
            color="#F97316"
            onUse={onDeployMine}
            hotkey="3"
          />
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Crosshair className="w-8 h-8 text-foreground/30" />
      </div>

      {/* Attitude indicator */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
        <div
          className="relative w-64 h-64 rounded-full border border-white/20 overflow-hidden"
          style={{ transform: `rotate(${(player.rotation[2] * 180) / Math.PI}deg)` }}
        >
          <div
            className="absolute left-0 right-0 h-[200%] bg-[linear-gradient(#ffffff33_1px,transparent_1px)]"
            style={{ top: `${((player.rotation[0] * 180) / Math.PI) * 2}px`, backgroundSize: "100% 16px" }}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-16 h-1 bg-white/60" />
        </div>
      </div>

      {/* Kill feed */}
      <KillFeedDisplay killFeed={killFeed} />

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 sm:right-4 hidden sm:block">
        <div className="px-2.5 py-1.5 rounded-lg bg-background/70 backdrop-blur-sm text-xs text-muted-foreground leading-relaxed">
          WASD = Mover | Espaco = Atirar | Shift = Turbo<br />
          1 = Missil | 2 = EMP | 3 = Mina
        </div>
      </div>

      {/* Touch buttons (mobile) */}
      <div className="absolute bottom-14 right-3 sm:hidden pointer-events-auto flex flex-col gap-2">
        <button
          onTouchStart={(e) => { e.preventDefault(); onFireMissile() }}
          className="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-500/10 flex items-center justify-center"
        >
          <Rocket className="w-5 h-5 text-red-400" />
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); onFireEMP() }}
          className="w-12 h-12 rounded-full border-2 border-yellow-500/50 bg-yellow-500/10 flex items-center justify-center"
        >
          <CircleDot className="w-5 h-5 text-yellow-400" />
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); onDeployMine() }}
          className="w-12 h-12 rounded-full border-2 border-orange-500/50 bg-orange-500/10 flex items-center justify-center"
        >
          <Bomb className="w-5 h-5 text-orange-400" />
        </button>
        <div className="w-16 h-16 rounded-full border-2 border-primary/50 bg-primary/10 flex items-center justify-center">
          <Crosshair className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Mini Radar */}
      <div className="absolute bottom-3 right-3 w-40 h-40 rounded-full bg-black/50 border border-white/20 pointer-events-none overflow-hidden hidden sm:block">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/10 -translate-x-1/2" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(-50%, -50%) rotate(${headingDeg}deg)` }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-emerald-300" />
          </div>
          {enemies?.slice(0, 20).map((e) => {
            const px = player.position[0], pz = player.position[2]
            const ex = e.position[0], ez = e.position[2]
            const dx = ex - px, dz = ez - pz
            const scale = 0.1
            let rx = dx * scale, rz = dz * scale
            const r = Math.hypot(rx, rz)
            const maxR = 75
            if (r > maxR) { const t = maxR / r; rx *= t; rz *= t }
            return (
              <div
                key={e.id}
                className="absolute w-2 h-2 rounded-full bg-red-400"
                style={{ left: 80 + rx, top: 80 + rz }}
              />
            )
          })}
        </div>
      </div>

      <LeaveButton onLeave={onLeave} />
    </div>
  )
}

function TopBar({ matchTime, playersAlive, points, minutes, seconds }: { matchTime: number; playersAlive: number; points: number; minutes: number; seconds: number }) {
  return (
    <div className="flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-sm">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-mono text-foreground">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-mono text-foreground">{playersAlive}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-sm">
        <Trophy className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-bold text-primary">{points.toLocaleString()}</span>
      </div>
    </div>
  )
}

function WeaponSlot({
  icon,
  count,
  label,
  color,
  onUse,
  hotkey,
}: {
  icon: React.ReactNode
  count: number
  label: string
  color: string
  onUse: () => void
  hotkey: string
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onUse() }}
      disabled={count <= 0}
      className="pointer-events-auto flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors min-h-[44px] min-w-[44px]"
      style={{
        opacity: count > 0 ? 1 : 0.3,
        backgroundColor: count > 0 ? color + "15" : "transparent",
      }}
    >
      <div style={{ color: count > 0 ? color : "#666" }}>{icon}</div>
      <span className="text-xs font-mono" style={{ color: count > 0 ? color : "#666" }}>
        {count}
      </span>
      <span className="text-[9px] text-muted-foreground hidden sm:block">[{hotkey}]</span>
    </button>
  )
}

function KillFeedDisplay({ killFeed }: { killFeed: KillFeedEntry[] }) {
  if (killFeed.length === 0) return null
  return (
    <div className="absolute top-14 right-3 sm:right-4 flex flex-col gap-1">
      {killFeed.map((entry, i) => (
        <div key={i} className="px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm text-xs">
          <span className="text-primary font-medium">{entry.killer}</span>
          <span className="text-muted-foreground">{" eliminado "}</span>
          <span className="text-destructive font-medium">{entry.victim}</span>
        </div>
      ))}
    </div>
  )
}

function LeaveButton({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="absolute bottom-3 left-3 pointer-events-auto">
      <button
        onClick={onLeave}
        className="px-3 py-1.5 rounded-md bg-destructive/80 text-destructive-foreground text-xs font-medium min-h-[44px]"
      >
        Sair
      </button>
    </div>
  )
}
