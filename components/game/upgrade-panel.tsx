"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Shield, Crosshair, Gauge, Loader2, ArrowUp, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { purchaseUpgrade, UpgradeType } from "@/app/actions/upgrades"
import { useToast } from "@/hooks/use-toast"
import { getGuestFlygold, setGuestFlygold } from "@/lib/guest-storage"

interface UpgradePanelProps {
  aircraft: any
  userBalance: number
  isGuest: boolean
  onUpgradeComplete: (newBalance: number, newStats: any) => void
}

const UPGRADE_CONFIG = {
  speed: { cost: 100, label: "Velocidade", icon: Gauge, color: "text-cyan-400", bg: "bg-cyan-500" },
  weapons: { cost: 150, label: "Armas", icon: Zap, color: "text-red-400", bg: "bg-red-500" },
  resistance: { cost: 120, label: "Blindagem", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500" },
  autoaim: { cost: 200, label: "Mira Auto", icon: Crosshair, color: "text-purple-400", bg: "bg-purple-500" },
}

export default function UpgradePanel({ aircraft, userBalance, isGuest, onUpgradeComplete }: UpgradePanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  // Extract current upgrades from aircraft data (handles both Auth and Guest structures)
  // For Guest, we expect aircraft to have a temporary 'upgrades' object if modified locally
  const upgrades = aircraft.full_json?.upgrades || aircraft.upgrades || { speed: 0, weapons: 0, resistance: 0, autoaim: 0 }
  
  const handleUpgrade = async (type: UpgradeType) => {
    const config = UPGRADE_CONFIG[type]
    
    if (userBalance < config.cost) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você precisa de ${config.cost} FlyGold.`,
        variant: "destructive",
      })
      return
    }

    setLoading(type)

    try {
      if (isGuest) {
        // GUEST MODE: Apply locally
        // Simulate delay
        await new Promise(r => setTimeout(r, 500))
        
        // Calculate new stats (Simplified logic mirroring server)
        const currentLevel = upgrades[type] || 0
        const newLevel = currentLevel + 1
        
        // Create deep copy of aircraft to modify
        const newAircraft = JSON.parse(JSON.stringify(aircraft))
        if (!newAircraft.upgrades) newAircraft.upgrades = { ...upgrades }
        newAircraft.upgrades[type] = newLevel
        
        // Update specs
        if (!newAircraft.specs_json) newAircraft.specs_json = { ...aircraft.specs_json } || {}
        // Fallback to base stats if specs_json is empty
        const specs = newAircraft.specs_json
        
        if (type === "speed") specs.maxSpeed = Math.round((specs.maxSpeed || aircraft.base_speed) * 1.1)
        if (type === "weapons") specs.firepower = Math.round((specs.firepower || aircraft.base_damage) * 1.15)
        if (type === "resistance") specs.durability = Math.round((specs.durability || aircraft.base_health) * 1.1)
        if (type === "autoaim") specs.autoAimChance = 0.20 + ((newLevel - 1) * 0.05)
        
        // If using full_json structure
        if (newAircraft.full_json) {
            newAircraft.full_json.upgrades = newAircraft.upgrades
            newAircraft.full_json.specs = specs
        }

        const currentFg = getGuestFlygold()
        const newFg = Math.max(0, currentFg - config.cost)
        setGuestFlygold(newFg)
        onUpgradeComplete(newFg, newAircraft)
        toast({ title: "Melhoria Temporária Aplicada!", description: "Será perdida ao sair." })
        
      } else {
        // AUTH MODE: Server Action
        const result = await purchaseUpgrade(aircraft.id, type)
        
        if (result.success) {
           // Merge result data into aircraft object
           const newAircraft = { 
               ...aircraft, 
               full_json: result.data, 
               upgrades: result.data.upgrades,
               [`upgrade_${type}_level`]: (upgrades[type] || 0) + 1
           }
           
           // Update specs for display
           if (result.data.specs) {
              newAircraft.base_speed = result.data.specs.maxSpeed
              newAircraft.base_damage = result.data.specs.firepower
              newAircraft.base_health = result.data.specs.durability
              // autoaim stored in specs usually
           }
           
           onUpgradeComplete(result.newBalance!, newAircraft)
           toast({ title: "Melhoria Adquirida!", description: "Salva permanentemente." })
        } else {
           toast({ title: "Erro", description: result.error, variant: "destructive" })
        }
      }
    } catch (error) {
      console.error(error)
      toast({ title: "Erro", description: "Falha ao processar melhoria.", variant: "destructive" })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
      <div className="col-span-2 flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-yellow-400" />
          Melhorias
        </h3>
        {isGuest && (
           <span className="text-[10px] text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-500/30">
             Modo Visitante (Não Salvo)
           </span>
        )}
      </div>

      {(Object.entries(UPGRADE_CONFIG) as [UpgradeType, typeof UPGRADE_CONFIG.speed][]).map(([key, config]) => {
        const level = upgrades[key] || 0
        const Icon = config.icon
        const isAffordable = userBalance >= config.cost

        return (
          <div key={key} className="relative group bg-slate-900/50 rounded-lg p-3 border border-white/5 hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${config.bg} bg-opacity-20`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{config.label}</div>
                  <div className="text-[10px] text-slate-400">Nível {level}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
               {/* Level Dots */}
               <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i < level ? config.bg : "bg-slate-700"}`} />
                  ))}
               </div>
               
               <Button 
                 size="sm" 
                 variant="secondary"
                 className="w-full h-7 text-[10px] gap-1 font-semibold"
                 onClick={() => handleUpgrade(key)}
                 disabled={loading !== null || !isAffordable || level >= 5}
               >
                 {loading === key ? (
                   <Loader2 className="w-3 h-3 animate-spin" />
                 ) : level >= 5 ? (
                   "MAX"
                 ) : (
                   <>
                     <span className="text-yellow-400">{config.cost}</span> FG
                   </>
                 )}
               </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
