"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { AircraftPart } from "@/lib/aircraft-database"
import { useRouter } from "next/navigation"
import { Loader2, Shield, Zap, Heart, Sword, Lock, Unlock, ShoppingCart, DollarSign, ChevronRight, ArrowUp } from "lucide-react"
import UpgradePanel from "@/components/game/upgrade-panel"
import { getGuestFlygold, getGuestPoints } from "@/lib/guest-storage"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

// Dynamically import HangarScene (heavy 3D component)
const HangarScene = dynamic(() => import("@/components/game/hangar-scene"), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <span className="ml-3 text-xl font-bold tracking-widest">LOADING HANGAR...</span>
    </div>
  )
})

interface Aircraft {
  id: string
  name: string
  description: string
  category: string
  base_speed: number
  base_health: number
  base_damage: number
  base_armor: number
  flygold_price: number
  is_default: boolean
  parts_json: AircraftPart[]
  custom_primary_color?: string
  upgrade_speed_level?: number
  upgrade_weapons_level?: number
  upgrade_resistance_level?: number
  upgrade_autoaim_level?: number
  specs_json?: any
  full_json?: any
}

interface EnhancedHangarProps {
  onAircraftSelect?: (aircraft: Aircraft) => void
  initialAircraftId?: string
}

import SyncUpgrades from "@/components/game/sync-upgrades"
import { saveAircraftColor, saveAircraftColorsByType } from "@/app/actions/upgrades"
import { HexColorPicker } from "react-colorful"

export default function EnhancedHangar({ onAircraftSelect, initialAircraftId }: EnhancedHangarProps) {
  const router = useRouter()
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [customColors, setCustomColors] = useState<Record<string, string>>({})
  const [ownedAircraftIds, setOwnedAircraftIds] = useState<Set<string>>(new Set())
  const [userBalance, setUserBalance] = useState<number>(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [showUpgrades, setShowUpgrades] = useState(false)
  const [guestPoints, setGuestPointsState] = useState<number>(0)
  const [starting, setStarting] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()
        
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id || null)

        // 2. Get User Data (Balance & Inventory) if logged in
        let ownedIds = new Set<string>()
        let inventoryMap = new Map<string, any>()

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("flygold_balance, role")
            .eq("id", user.id)
            .single()
          
          if (profile) {
            setUserBalance(profile.flygold_balance || 0)
            setUserRole(profile.role)
          }

          const { data: inventory } = await supabase
            .from("player_aircraft")
            .select("aircraft_id, custom_full_json, custom_primary_color, upgrade_speed_level, upgrade_weapons_level, upgrade_resistance_level, upgrade_autoaim_level")
            .eq("player_id", user.id)
          
          if (inventory) {
             // Map inventory data to state
             inventory.forEach((item) => {
                 ownedIds.add(item.aircraft_id)
                 inventoryMap.set(item.aircraft_id, item)
             })
          }
        }
        setOwnedAircraftIds(ownedIds)

        if (!user) {
          const fg = getGuestFlygold()
          setUserBalance(fg)
          setGuestPointsState(getGuestPoints())
        }

        // 3. Get Aircraft (client-side filter to maximize visibility)
        const { data: aircraftData, error } = await supabase
          .from("aircraft")
          .select("*")
          .order("flygold_price", { ascending: true })

        if (error) throw error
        
        if (aircraftData) {
           // Filter: show published to guests; show own + published to logged users
           const visible = (aircraftData as any[]).filter((ac) => {
             if (user) return ac.is_published === true || ac.created_by === user.id
             return ac.is_published === true
           })
           
           // Get guest local data
           const guestUpgrades = !user ? JSON.parse(localStorage.getItem("guest_upgrades_pending") || "{}") : {}
          const guestColors = !user ? JSON.parse(localStorage.getItem("guest_colors") || "{}") : {}
          const guestColorsByType = !user ? JSON.parse(localStorage.getItem("guest_colors_by_type") || "{}") : {}

          // Parse parts_json if it's a string, or use as is if object
          const formattedAircraft = visible.map((ac: any) => {
            
            // MERGE USER DATA (Upgrades & Color)
            let userSpecificData: any = {}
            
            if (user) {
                // Find in inventory
                const item = inventoryMap.get(ac.id)
                if (item) {
                    userSpecificData = {
                        custom_primary_color: item.custom_primary_color,
                        upgrade_speed_level: item.upgrade_speed_level || 0,
                        upgrade_weapons_level: item.upgrade_weapons_level || 0,
                        upgrade_resistance_level: item.upgrade_resistance_level || 0,
                        upgrade_autoaim_level: item.upgrade_autoaim_level || 0,
                        custom_colors_json: item.custom_colors_json || {}
                    }
                }
            } else {
                // Guest Mode
                const upgrades = guestUpgrades[ac.id] || {}
                userSpecificData = {
                    custom_primary_color: guestColors[ac.id],
                    upgrade_speed_level: upgrades.speed || 0,
                    upgrade_weapons_level: upgrades.weapons || 0,
                    upgrade_resistance_level: upgrades.resistance || 0,
                    upgrade_autoaim_level: upgrades.autoaim || 0,
                    custom_colors_json: guestColorsByType[ac.id] || {}
                }
            }

            let parsedParts: any = ac.parts_json
            if (typeof parsedParts === "string") {
              try {
                parsedParts = JSON.parse(parsedParts)
              } catch {
                parsedParts = null
              }
            }

            // Priority: Check full_code_json first (New Column)
            let fullCode: any = null
            if (ac.full_code_json) {
              try {
                fullCode = typeof ac.full_code_json === "string" ? JSON.parse(ac.full_code_json) : ac.full_code_json
              } catch {
                fullCode = null
              }
            }

            const hasValidFullCode = fullCode && typeof fullCode === "object" && Array.isArray(fullCode.parts) && fullCode.parts.length > 0
            if (hasValidFullCode) {
                 return {
                    ...ac,
                    ...userSpecificData,
                    parts_json: fullCode.parts, // Extract parts array
                    specs_json: fullCode.specs, // Keep specs if needed
                    full_json: fullCode, // Keep full object reference
                    // Override base stats if specs are present in the JSON
                    base_speed: fullCode.specs?.maxSpeed || ac.base_speed,
                    base_health: fullCode.specs?.durability || ac.base_health, // Map durability to health
                    base_damage: fullCode.specs?.firepower || ac.base_damage, // Map firepower to damage
                    base_armor: fullCode.specs?.armor || ac.base_armor
                 }
            }

            // Fallback: Check if parts_json is the "Complete Code" object (Legacy/Migration)
            if (parsedParts && !Array.isArray(parsedParts) && parsedParts.parts) {
              // It's the full object structure
              // We can also extract specs here if we want to override base stats
              // For now, let's just ensure parts_json refers to the parts array for rendering
              
              // If specs are present in the JSON, we might want to use them to override the DB columns
              // strictly for display if they differ, but usually DB columns are the source of truth for game logic.
              // However, the user wants the "complete code" from CAD to be used.
              
              // Let's store the full object in a separate property if needed, 
              // but for compatibility, parts_json should probably be the parts array 
              // OR we handle the object downstream.
              
              // To avoid breaking HangarScene and GameArena which expect parts_json to be the array:
              return {
                ...ac,
                parts_json: parsedParts.parts,
                specs_json: parsedParts.specs,
                full_json: parsedParts,
                // Override base stats if specs are present in the JSON
                base_speed: parsedParts.specs?.maxSpeed || ac.base_speed,
                base_health: parsedParts.specs?.durability || ac.base_health, // Map durability to health
                base_damage: parsedParts.specs?.firepower || ac.base_damage, // Map firepower to damage
                base_armor: parsedParts.specs?.armor || ac.base_armor
              }
            }

            return {
              ...ac,
              ...userSpecificData,
              parts_json: Array.isArray(parsedParts) ? parsedParts : []
            }
          })
          
          setAircraftList(formattedAircraft)
          
          // Select initial aircraft
          if (formattedAircraft.length > 0) {
            const initial = formattedAircraft.find(a => a.id === initialAircraftId) || formattedAircraft[0]
            setSelectedAircraft(initial)
            setCustomColors(((initial as any).custom_colors_json) || {})
            if (onAircraftSelect) onAircraftSelect(initial)
          }
        }
      } catch (err) {
        console.error("Error loading hangar data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [initialAircraftId, onAircraftSelect])

  // Handle Purchase
  const handlePurchase = async () => {
    if (!selectedAircraft || !userId) {
      router.push("/auth/login")
      return
    }

    if (userBalance < selectedAircraft.flygold_price) {
      // Redirect to buy FlyGold or show modal
      if (confirm("Saldo insuficiente! Deseja comprar mais FlyGold?")) {
        router.push("/flygold") // Assuming this route exists
      }
      return
    }

    const isFree = selectedAircraft.flygold_price === 0
    const confirmMessage = isFree 
      ? `Adicionar ${selectedAircraft.name} ao seu hangar gratuitamente?`
      : `Comprar ${selectedAircraft.name} por ${selectedAircraft.flygold_price} FlyGold?`

    if (!confirm(confirmMessage)) return

    setPurchasing(true)
    const supabase = createClient()

    try {
      // 1. Deduct Balance
      const newBalance = userBalance - selectedAircraft.flygold_price
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ flygold_balance: newBalance })
        .eq("id", userId)

      if (balanceError) throw balanceError
      setUserBalance(newBalance)

      // 2. Add to Inventory
      const { error: inventoryError } = await supabase
        .from("player_aircraft")
        .insert({
          player_id: userId,
          aircraft_id: selectedAircraft.id,
          is_equipped: true // Auto equip on buy
        })

      if (inventoryError) throw inventoryError

      // 3. Update Local State
      setOwnedAircraftIds(prev => new Set(prev).add(selectedAircraft.id))
      alert(`Compra realizada com sucesso! Você adquiriu o ${selectedAircraft.name}.`)

    } catch (err: any) {
      console.error("Purchase error:", err)
      alert("Erro na compra: " + err.message)
    } finally {
      setPurchasing(false)
    }
  }

  // Handle Equip/Select
  const handleEquip = async () => {
    if (!selectedAircraft) return
    
    try {
      const supabase = createClient()

      if (userId) {
        const { error } = await supabase
          .from("player_aircraft")
          .update({ is_equipped: true })
          .eq("player_id", userId)
          .eq("aircraft_id", selectedAircraft.id)
        if (error) throw error
      }
      
      // Prefer full_json.parts if available; fallback to parts_json
      const partsFromFull = (selectedAircraft as any).full_json?.parts
      const partsToSave = Array.isArray(partsFromFull)
        ? partsFromFull
        : Array.isArray(selectedAircraft.parts_json)
        ? selectedAircraft.parts_json
        : []

      localStorage.setItem("selected_aircraft_id", selectedAircraft.id)
      localStorage.setItem("selected_aircraft_id", selectedAircraft.id)
      localStorage.setItem("selected_aircraft_parts", JSON.stringify(partsToSave))
      localStorage.setItem("selected_aircraft_color", (selectedAircraft as any).custom_primary_color || "#64748b")
      localStorage.setItem("selected_aircraft_colors", JSON.stringify(customColors || {}))
      localStorage.setItem(
        "selected_aircraft_upgrades",
        JSON.stringify({
          speed: selectedAircraft.upgrade_speed_level || 0,
          weapons: selectedAircraft.upgrade_weapons_level || 0,
          resistance: selectedAircraft.upgrade_resistance_level || 0,
          autoaim: selectedAircraft.upgrade_autoaim_level || 0,
        })
      )
      
      // Prefer specs from full_json/specs_json when present
      const specs = (selectedAircraft as any).full_json?.specs || selectedAircraft.specs_json || {}
      const currentStats = {
        speed: specs.maxSpeed ?? selectedAircraft.base_speed,
        health: specs.durability ?? selectedAircraft.base_health,
        damage: specs.firepower ?? selectedAircraft.base_damage,
        armor: specs.armor ?? selectedAircraft.base_armor,
        autoAimChance: specs.autoAimChance || 0
      }
      
      localStorage.setItem("selected_aircraft_stats", JSON.stringify(currentStats))
      
      alert(`${selectedAircraft.name} equipado e pronto para decolagem!`)
      
      if (onAircraftSelect) onAircraftSelect(selectedAircraft)

      setTimeout(() => router.push("/play"), 1000)
      
    } catch (error) {
      console.error("Error equipping aircraft:", error)
      alert("Erro ao equipar aeronave")
    }
  }

  // Calculate stats percentage for bars
  const getStatPercent = (value: number, max: number = 100) => Math.min(100, (value / max) * 100)

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span className="font-mono text-lg tracking-wider">INITIALIZING HANGAR SYSTEM...</span>
      </div>
    )
  }

  const isOwned = selectedAircraft && (selectedAircraft.is_default || ownedAircraftIds.has(selectedAircraft.id))
  const canAfford = selectedAircraft && userBalance >= selectedAircraft.flygold_price

  // Handle Color Change
  const handleColorChange = async (color: string) => {
      if (!selectedAircraft) return
      
      const updated = { ...selectedAircraft, custom_primary_color: color }
      setSelectedAircraft(updated as any)
      setAircraftList(prev => prev.map(ac => ac.id === updated.id ? updated as any : ac))
      
      if (userId) {
          await saveAircraftColor(selectedAircraft.id, color)
      } else {
         // Guest: Save locally
         // TODO: Add to localstorage for guest persistence
         const localColors = JSON.parse(localStorage.getItem("guest_colors") || "{}")
         localColors[selectedAircraft.id] = color
         localStorage.setItem("guest_colors", JSON.stringify(localColors))
      }
  }

  const PART_GROUPS = [
    { key: "fuselage", label: "Fuselagem", types: ["fuselage", "engine", "missile", "fuel_tank"] },
    { key: "wing", label: "Asas", types: ["wing", "leading_edge", "flap", "aileron", "lerx", "canard", "tail_h"] },
    { key: "tail", label: "Cauda", types: ["tail_v"] },
    { key: "intake", label: "Entradas", types: ["intake", "ramp"] },
    { key: "nozzle", label: "Bocal", types: ["nozzle", "afterburner"] },
    { key: "canopy", label: "Canopy", types: ["canopy", "cockpit", "hud"] },
  ]

  const handleCustomColorChange = (groupKey: string, color: string) => {
    setCustomColors((prev) => ({ ...prev, [groupKey]: color }))
    if (!selectedAircraft) return
    if (!userId) {
      const guestColorsByType = JSON.parse(localStorage.getItem("guest_colors_by_type") || "{}")
      guestColorsByType[selectedAircraft.id] = { ...(guestColorsByType[selectedAircraft.id] || {}), [groupKey]: color }
      localStorage.setItem("guest_colors_by_type", JSON.stringify(guestColorsByType))
    }
  }

  const saveCustomColors = async () => {
    if (!selectedAircraft) return
    if (userId) {
      await saveAircraftColorsByType(selectedAircraft.id, customColors)
    }
  }

  const previewColoredParts = (parts?: AircraftPart[]) => {
    if (!parts) return []
    const primary = (selectedAircraft as any)?.custom_primary_color || "#64748b"
    const colors = customColors || {}
    return parts.map((p) => {
      const t = (p.type || "").toLowerCase()
      const isGlass = t === "canopy" || t === "cockpit" || t === "hud"
      let override = undefined as string | undefined
      for (const g of PART_GROUPS) {
        if (g.types.includes(t) && colors[g.key]) {
          override = colors[g.key]
          break
        }
      }
      if (override) return { ...p, color: override }
      if (!isGlass && primary) return { ...p, color: primary }
      return { ...p }
    })
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans">
      {/* Global Start Button (outside right panel) */}
      <div className="absolute right-6 bottom-6 z-30 pointer-events-auto">
        <button
          onClick={async () => {
            if (!selectedAircraft) return
            const isOwned = selectedAircraft.is_default || ownedAircraftIds.has(selectedAircraft.id)
            if (!isOwned) return
            setStarting(true)
            await handleEquip()
            setStarting(false)
            router.push("/play")
          }}
          disabled={!selectedAircraft || !(selectedAircraft.is_default || ownedAircraftIds.has(selectedAircraft?.id || "")) || starting}
          className={`px-5 py-3 rounded-lg font-bold text-sm transition-all ${
            !selectedAircraft || !(selectedAircraft.is_default || ownedAircraftIds.has(selectedAircraft?.id || "")) || starting
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          }`}
        >
          {starting ? "INICIANDO..." : "INICIAR JOGO"}
        </button>
      </div>
      
      {/* 3D SCENE BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <HangarScene 
          parts={previewColoredParts(selectedAircraft?.parts_json)}
          isSelected={true}
          aircraftColor={(selectedAircraft as any)?.custom_primary_color || "#64748b"} 
        />
        
        {/* Cinematic Vignette & Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_60%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,180,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,180,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      </div>

      {/* HEADER UI */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] italic tracking-tighter">
              HANGAR
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1 w-20 bg-blue-500 rounded-full" />
              <span className="text-xs text-blue-400 font-mono tracking-widest">SYSTEM ONLINE</span>
            </div>
          </div>

          {(userRole === "admin" || userRole === "master") && (
            <button
              onClick={() => router.push("/admin")}
              className="pointer-events-auto bg-red-900/50 hover:bg-red-800/80 text-red-200 px-4 py-2 rounded border border-red-500/30 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 shadow-[0_0_10px_rgba(220,38,38,0.2)]"
            >
              <Shield className="w-4 h-4" />
              ADMIN ACCESS
            </button>
          )}
        </div>

        <div className="pointer-events-auto bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <div className="bg-amber-500/20 p-1.5 rounded-full">
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-amber-200 uppercase tracking-wider">FlyGold Balance</span>
            <span className="text-xl font-bold text-amber-400 leading-none">{userBalance.toLocaleString()}</span>
          </div>
          <button 
            onClick={() => router.push("/flygold")}
            className="ml-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* LEFT SIDEBAR - AIRCRAFT LIST */}
      <div className="absolute left-6 top-32 bottom-24 w-64 z-20 flex flex-col gap-3 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm border-l-4 border-blue-500 p-2 mb-2">
          <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest">Available Units</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 pointer-events-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-transparent">
          <div className="flex flex-col gap-2">
            {aircraftList.map((ac) => {
              const acOwned = ac.is_default || ownedAircraftIds.has(ac.id)
              const isSelected = selectedAircraft?.id === ac.id
              
              return (
                <button
                  key={ac.id}
                  onClick={() => setSelectedAircraft(ac)}
                  className={`relative group w-full text-left p-3 rounded-r-lg border-l-2 transition-all duration-200 overflow-hidden
                    ${isSelected 
                      ? "bg-gradient-to-r from-blue-900/80 to-blue-900/20 border-blue-400 translate-x-2" 
                      : "bg-black/40 hover:bg-black/60 border-slate-700 hover:border-slate-500"
                    }
                  `}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <div className={`font-bold text-sm ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {ac.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-slate-500 uppercase">{ac.category}</div>
                        {ac.is_default && <span className="text-[8px] bg-blue-900/50 text-blue-300 px-1 rounded uppercase tracking-wider">Starter</span>}
                      </div>
                    </div>
                    {acOwned ? (
                      <Unlock className="w-3 h-3 text-green-500 opacity-70" />
                    ) : (
                      <Lock className="w-3 h-3 text-red-500 opacity-70" />
                    )}
                  </div>
                  
                  {/* Selection Glow */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - AIRCRAFT DETAILS */}
      {selectedAircraft && (
        <div className="absolute right-6 top-32 bottom-24 w-80 z-20 flex flex-col pointer-events-none">
          {/* Main Info Card */}
            <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden pointer-events-auto">
              {/* Tech Decoration */}
              <div className="absolute top-0 right-0 p-2 opacity-20">
                <div className="w-16 h-16 border-t-2 border-r-2 border-blue-500 rounded-tr-xl" />
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-black text-white uppercase italic leading-none mb-1">
                    {selectedAircraft.name}
                  </h2>
                  <div className="flex flex-col items-end">
                     {/* Difficulty Rating */}
                     <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div 
                            key={star} 
                            className={`w-1.5 h-4 -skew-x-12 ${
                              star <= (selectedAircraft.base_damage / 20) + 1 // Rough calc for difficulty/tier
                              ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]" 
                              : "bg-slate-800"
                            }`} 
                          />
                        ))}
                     </div>
                     <span className="text-[10px] text-amber-500 font-bold tracking-wider uppercase">
                        TIER {(selectedAircraft.base_damage / 20 + 1).toFixed(0)}
                     </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-blue-400 text-xs font-mono mt-2">
                  <span className="px-1.5 py-0.5 border border-blue-500/50 rounded bg-blue-500/10">
                    {selectedAircraft.category.toUpperCase()}
                  </span>
                  <span>MK-{selectedAircraft.id.slice(0,4).toUpperCase()}</span>
                </div>
              </div>

              {/* Stats Grid */}
            <div className="space-y-4 mb-8">
              {/* Color Customization for Owned Aircraft */}
              {isOwned && (
                <div className="mb-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500" />
                      Paint Job
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedAircraft.custom_primary_color || "#64748b"}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        title="Cor Primária"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs">
                            Editar
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-slate-900 border border-slate-700 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            {PART_GROUPS.map((g) => (
                              <div key={g.key} className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded">
                                <span className="text-[10px] text-slate-300 uppercase tracking-wider">{g.label}</span>
                                <input
                                  type="color"
                                  value={customColors[g.key] || "#64748b"}
                                  onChange={(e) => handleCustomColorChange(g.key, e.target.value)}
                                  className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={saveCustomColors}
                              className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs"
                            >
                              Salvar
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
              
              <StatBar 
                label="SPEED" 
                value={selectedAircraft.base_speed} 
                max={2500} 
                icon={<Zap className="w-3 h-3" />} 
                color="bg-yellow-400"
              />
              <StatBar 
                label="ARMOR" 
                value={selectedAircraft.base_armor} 
                max={100} 
                icon={<Shield className="w-3 h-3" />} 
                color="bg-blue-400"
              />
              <StatBar 
                label="FIREPOWER" 
                value={selectedAircraft.base_damage} 
                max={100} 
                icon={<Sword className="w-3 h-3" />} 
                color="bg-red-400"
              />
              <StatBar 
                label="HEALTH" 
                value={selectedAircraft.base_health} 
                max={500} 
                icon={<Heart className="w-3 h-3" />} 
                color="bg-green-400"
              />
            </div>

            {/* Action Area */}
            <div className="mt-auto">
              {isOwned ? (
                <button
                  onClick={handleEquip}
                  className="w-full group relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <span>EQUIPAR</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2 text-sm text-slate-400">
                    <span>Acquisition Cost:</span>
                    <span className={canAfford ? "text-green-400" : "text-red-400"}>
                      {canAfford ? "AFFORDABLE" : "INSUFFICIENT FUNDS"}
                    </span>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || !canAfford}
                    className={`w-full relative overflow-hidden font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] text-white
                      ${canAfford 
                        ? (selectedAircraft.flygold_price === 0 ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.5)]")
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      }
                    `}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {purchasing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {selectedAircraft.flygold_price === 0 ? <Unlock className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                          <span>{selectedAircraft.flygold_price === 0 ? "CLAIM FREE" : "PURCHASE"}</span>
                          {selectedAircraft.flygold_price > 0 && (
                            <span className="bg-black/20 px-2 py-0.5 rounded text-sm ml-1">
                              {selectedAircraft.flygold_price.toLocaleString()} FG
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Description Box */}
          <div className="mt-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 pointer-events-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs text-slate-400 uppercase font-bold">Tactical Briefing</h4>
              <button 
                onClick={() => setShowUpgrades(!showUpgrades)}
                className="text-[10px] flex items-center gap-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 transition-colors"
              >
                <ArrowUp className="w-3 h-3" />
                {showUpgrades ? "Hide Upgrades" : "Open Upgrades"}
              </button>
          </div>
          
          {showUpgrades ? (
              <UpgradePanel 
                aircraft={selectedAircraft}
                userBalance={userBalance}
                isGuest={!userId}
                onUpgradeComplete={(newBalance, newAircraft) => {
                    setUserBalance(newBalance)
                    // Update aircraft in list and selected
                    const updatedList = aircraftList.map(a => a.id === newAircraft.id ? newAircraft : a)
                    setAircraftList(updatedList)
                    setSelectedAircraft(newAircraft)
                    
                    // GUEST MODE: Save pending upgrades to localStorage for later sync
                    if (!userId) {
                        try {
                            const pendingStr = localStorage.getItem("guest_upgrades_pending")
                            const pending = pendingStr ? JSON.parse(pendingStr) : {}
                            pending[newAircraft.id] = newAircraft.upgrades
                            localStorage.setItem("guest_upgrades_pending", JSON.stringify(pending))
                        } catch (e) {
                            console.error("Failed to save guest upgrades locally", e)
                        }
                    }
                }}
              />
          ) : (
              <p className="text-sm text-slate-300 leading-relaxed">
                {selectedAircraft.description || "No tactical briefing available for this unit. Standard operating procedures apply."}
              </p>
          )}
        </div>
        
        {/* Sync Component */}
        <SyncUpgrades />
        </div>
      )}

      {/* BOTTOM UI - ARSENAL / LOADOUT */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">
         
         <div className="mb-2 flex items-center gap-2 opacity-80">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-500" />
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">WEAPON SYSTEMS</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-500" />
         </div>

         <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-8 py-4 flex items-center gap-6 pointer-events-auto shadow-2xl">
            {/* Dynamic Weapons */}
            {selectedAircraft?.parts_json && Array.isArray(selectedAircraft.parts_json) && selectedAircraft.parts_json.some(p => p.type && (p.type.startsWith("weapon") || p.type === "cannon")) ? (
              selectedAircraft.parts_json
                .filter(p => p.type && (p.type.startsWith("weapon") || p.type === "cannon"))
                .slice(0, 5) // Limit to 5
                .map((part, index) => (
                  <div key={index} className="group flex flex-col items-center cursor-pointer relative">
                    <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 group-hover:border-blue-500 transition-colors flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                      <Sword className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <div className="absolute bottom-0 right-0 px-1 bg-slate-800 text-[8px] text-slate-300 font-mono border-tl-sm rounded-tl">
                        MK-{index + 1}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase mt-2 group-hover:text-blue-400 transition-colors truncate max-w-[80px] font-bold tracking-tight">
                      {part.label || part.type.replace(/_/g, " ")}
                    </span>
                    
                    {/* Connection Line */}
                    <div className="absolute -top-4 left-1/2 w-[1px] h-4 bg-slate-700 group-hover:bg-blue-500/50 transition-colors" />
                  </div>
                ))
            ) : (
              // Fallback Default Weapon
              <div className="group flex flex-col items-center cursor-pointer relative">
                <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 group-hover:border-blue-500 transition-colors flex items-center justify-center relative overflow-hidden">
                  <Sword className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  <div className="absolute bottom-0 right-0 px-1 bg-slate-800 text-[8px] text-slate-300 font-mono">STD</div>
                </div>
                <span className="text-[10px] text-slate-400 uppercase mt-2 group-hover:text-blue-400 transition-colors font-bold">
                  20mm Cannon
                </span>
                 <div className="absolute -top-4 left-1/2 w-[1px] h-4 bg-slate-700 group-hover:bg-blue-500/50 transition-colors" />
              </div>
            )}

            <div className="h-10 w-[1px] bg-slate-800 mx-2" />

            {/* Empty Slots Filler */}
            {Array.from({ length: Math.max(0, 4 - (selectedAircraft?.parts_json?.filter((p: any) => p.type && p.type.startsWith("weapon")).length || 0)) }).map((_, i) => (
              <div key={`empty-${i}`} className="group flex flex-col items-center cursor-pointer relative opacity-40 hover:opacity-80 transition-opacity">
                <div className="w-14 h-14 rounded-lg bg-slate-900/30 border border-dashed border-slate-800 group-hover:border-amber-500/30 transition-colors flex items-center justify-center">
                   <span className="text-slate-700 group-hover:text-amber-500/50 text-xs font-mono">+</span>
                </div>
                <span className="text-[10px] text-slate-700 uppercase mt-2 group-hover:text-amber-500/50 transition-colors font-mono">Empty</span>
              </div>
            ))}
         </div>
      </div>

    </div>
  )
}

// Helper Component for Stats
function StatBar({ label, value, max, icon, color }: { label: string, value: number, max: number, icon: React.ReactNode, color: string }) {
  const percent = Math.min(100, (value / max) * 100)
  
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-1">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold group-hover:text-white transition-colors">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-xs font-mono text-slate-500">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out relative`}
          style={{ width: `${percent}%` }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
        </div>
      </div>
    </div>
  )
}
