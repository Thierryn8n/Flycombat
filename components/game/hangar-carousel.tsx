"use client"

import { useState, useEffect } from "react"
import { Aircraft } from "@/lib/game/types"
import dynamic from "next/dynamic"

const HangarScene = dynamic(() => import("@/components/game/hangar-scene"), { ssr: false })

interface HangarAircraft {
  id: number
  name: string
  category: string
  color: string
  stats: {
    speed: number
    durability: number
    agility: number
  }
  realSpecs: {
    maxSpeed: string
    range: string
    ceiling: string
    armament: string
    manufacturer: string
    year: number
  }
  isUnlocked?: boolean
  model_3d_code?: string
  model_3d_file_url?: string
  price_flygold?: number
  description?: string
}

// Função para converter aeronaves do Supabase para o formato do Hangar
function convertSupabaseAircrafts(supabaseAircrafts: any[]): HangarAircraft[] {
  return supabaseAircrafts.map((aircraft) => ({
    id: aircraft.id,
    name: aircraft.name,
    category: aircraft.category,
    color: aircraft.color || "#2563eb",
    stats: {
      speed: Math.floor(Math.random() * 30) + 70, // Placeholder - pode ser calculado baseado nas specs reais
      durability: Math.floor(Math.random() * 30) + 60,
      agility: Math.floor(Math.random() * 30) + 70
    },
    realSpecs: {
      maxSpeed: aircraft.max_speed || "N/A",
      range: aircraft.range || "N/A",
      ceiling: "N/A",
      armament: aircraft.engine_type || "N/A",
      manufacturer: aircraft.manufacturer || "N/A",
      year: aircraft.year || new Date().getFullYear()
    },
    isUnlocked: !aircraft.is_locked,
    model_3d_code: aircraft.model_3d_code,
    model_3d_file_url: aircraft.model_3d_file_url,
    price_flygold: aircraft.price_flygold,
    description: aircraft.description
  }))
}

// Dados de aeronaves reais - HANGAR ÚNICO
const HANGAR_AIRCRAFT: HangarAircraft[] = [
  // CAÇAS
  {
    id: 1,
    name: "F-5 Tiger II",
    category: "fighter",
    color: "#2563eb",
    stats: { speed: 85, durability: 70, agility: 95 },
    realSpecs: {
      maxSpeed: "1,700 km/h",
      range: "2,400 km",
      ceiling: "15,800 m",
      armament: "2x 20mm M39 + AIM-9",
      manufacturer: "Northrop",
      year: 1962
    },
    isUnlocked: true
  },
  {
    id: 2,
    name: "F-100 Super Sabre",
    category: "fighter",
    color: "#dc2626",
    stats: { speed: 90, durability: 65, agility: 88 },
    realSpecs: {
      maxSpeed: "1,390 km/h",
      range: "2,080 km",
      ceiling: "16,300 m",
      armament: "4x 20mm M39 + AIM-9",
      manufacturer: "North American",
      year: 1954
    },
    isUnlocked: false
  },
  {
    id: 3,
    name: "Mirage III",
    category: "fighter",
    color: "#059669",
    stats: { speed: 95, durability: 60, agility: 92 },
    realSpecs: {
      maxSpeed: "2,350 km/h",
      range: "2,400 km",
      ceiling: "17,000 m",
      armament: "2x 30mm DEFA + R550",
      manufacturer: "Dassault",
      year: 1961
    },
    isUnlocked: false
  },
  // ATAQUE
  {
    id: 4,
    name: "A-6 Intruder",
    category: "attack",
    color: "#7c2d12",
    stats: { speed: 55, durability: 85, agility: 45 },
    realSpecs: {
      maxSpeed: "1,037 km/h",
      range: "5,200 km",
      ceiling: "12,900 m",
      armament: "5x 20mm Mk 12 + Bombas",
      manufacturer: "Grumman",
      year: 1963
    },
    isUnlocked: true
  },
  {
    id: 5,
    name: "Falcon X",
    category: "fighter",
    color: "#3b82f6",
    stats: { speed: 80, durability: 70, agility: 85 },
    realSpecs: {
      maxSpeed: "1,200 km/h",
      range: "3,000 km",
      ceiling: "15,000 m",
      armament: "1x 20mm + AIM-9",
      manufacturer: "FlyGold",
      year: 2024
    },
    isUnlocked: true
  },
  {
    id: 6,
    name: "Titan V",
    category: "bomber",
    color: "#ef4444",
    stats: { speed: 55, durability: 95, agility: 40 },
    realSpecs: {
      maxSpeed: "900 km/h",
      range: "4,500 km",
      ceiling: "12,000 m",
      armament: "2x 30mm + Bombas",
      manufacturer: "FlyGold",
      year: 2024
    },
    isUnlocked: false
  }
]

interface HangarCarouselProps {
  onSelectAircraft: (aircraftId: number) => void
  onInspectAircraft: (aircraft: HangarAircraft) => void
  selectedAircraftId: number | null
  userAircrafts: Aircraft[]
  onClose?: () => void
}

export default function HangarCarousel({
  onSelectAircraft,
  onInspectAircraft,
  selectedAircraftId,
  userAircrafts,
  onClose
}: HangarCarouselProps) {
  const [selectedAircraft, setSelectedAircraft] = useState<HangarAircraft | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hangarAircrafts, setHangarAircrafts] = useState<HangarAircraft[]>([])

  const handlePurchase = async (aircraft: HangarAircraft) => {
    if (!aircraft.price_flygold) return
    try {
      const response = await fetch('/api/aircraft/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aircraftId: aircraft.id, price: aircraft.price_flygold })
      })
      if (!response.ok) throw new Error('Falha na compra')
      const updated = hangarAircrafts.map(a => a.id === aircraft.id ? { ...a, isUnlocked: true } : a)
      setHangarAircrafts(updated)
      const updatedAircraft = updated.find(a => a.id === aircraft.id)
      if (updatedAircraft) setSelectedAircraft(updatedAircraft)
    } catch (error) {
      alert('Erro ao comprar aeronave: ' + (error as Error).message)
    }
  }

  useEffect(() => {
    // Converter aeronaves do Supabase para o formato do Hangar
    const convertedAircrafts = convertSupabaseAircrafts(userAircrafts)
    setHangarAircrafts(convertedAircrafts)

    // Selecionar aeronave inicial baseada na seleção do usuário
    const userSelected = convertedAircrafts.find(aircraft => 
      aircraft.id === selectedAircraftId
    )
    if (userSelected) {
      setSelectedAircraft(userSelected)
      setCurrentIndex(convertedAircrafts.indexOf(userSelected))
      if (userSelected.isUnlocked) onSelectAircraft(userSelected.id)
    } else if (convertedAircrafts.length > 0) {
      const firstUnlocked = convertedAircrafts.find(a => a.isUnlocked) || convertedAircrafts[0]
      setSelectedAircraft(firstUnlocked)
      setCurrentIndex(convertedAircrafts.indexOf(firstUnlocked))
      if (firstUnlocked.isUnlocked) onSelectAircraft(firstUnlocked.id)
    }
  }, [userAircrafts, selectedAircraftId, onSelectAircraft])

  const handleSelect = (aircraft: HangarAircraft) => {
    if (aircraft.isUnlocked) {
      setSelectedAircraft(aircraft)
      onSelectAircraft(aircraft.id)
    }
  }

  const handleInspect = (aircraft: HangarAircraft) => {
    if (aircraft.isUnlocked) {
      onInspectAircraft(aircraft)
    }
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % hangarAircrafts.length
    setCurrentIndex(nextIndex)
    const nextAircraft = hangarAircrafts[nextIndex]
    if (nextAircraft.isUnlocked) {
      setSelectedAircraft(nextAircraft)
      onSelectAircraft(nextAircraft.id)
    }
  }

  const handlePrev = () => {
    const prevIndex = currentIndex === 0 ? hangarAircrafts.length - 1 : currentIndex - 1
    setCurrentIndex(prevIndex)
    const prevAircraft = hangarAircrafts[prevIndex]
    if (prevAircraft.isUnlocked) {
      setSelectedAircraft(prevAircraft)
      onSelectAircraft(prevAircraft.id)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-white">HANGAR</h1>
        <div className="flex items-center gap-4">
          <div className="text-white/70">
            <span className="text-sm">AERONAVES: </span>
            <span className="text-lg font-bold">{HANGAR_AIRCRAFT.filter(a => a.isUnlocked).length}/{HANGAR_AIRCRAFT.length}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white font-bold transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Área Principal - Carrossel */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Botão Anterior */}
        <button
          onClick={handlePrev}
          className="absolute left-8 z-10 w-12 h-12 bg-slate-700/50 hover:bg-slate-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          ←
        </button>

        {/* Cards do Carrossel */}
        <div className="flex gap-4 overflow-hidden px-8 max-w-6xl">
          {hangarAircrafts.map((aircraft, index) => {
            const isSelected = selectedAircraft?.id === aircraft.id
            const isVisible = Math.abs(index - currentIndex) <= 1
            
            return (
              <div
                key={aircraft.id}
                className={`
                  relative transition-all duration-500 ease-in-out
                  ${isVisible ? 'opacity-100 scale-100' : 'opacity-30 scale-75'}
                  ${isSelected ? 'scale-110 z-10' : ''}
                `}
                style={{ minWidth: '280px' }}
              >
                <div
                  className={`
                    relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border-2 p-6 h-96
                    cursor-pointer transition-all duration-300 overflow-hidden
                    ${isSelected 
                      ? `border-${aircraft.color.replace('#', '')} shadow-2xl shadow-${aircraft.color.replace('#', '')}/50` 
                      : aircraft.isUnlocked 
                        ? 'border-slate-600 hover:border-slate-500 hover:shadow-lg' 
                        : 'border-slate-700 opacity-60'
                    }
                    ${!aircraft.isUnlocked ? 'grayscale' : ''}
                  `}
                  onClick={() => handleSelect(aircraft)}
                  onDoubleClick={() => handleInspect(aircraft)}
                >
                  {/* Efeito de brilho quando selecionado */}
                  {isSelected && (
                    <div 
                      className="absolute inset-0 opacity-20 animate-pulse"
                      style={{ 
                        background: `linear-gradient(135deg, ${aircraft.color}20, transparent, ${aircraft.color}20)` 
                      }}
                    />
                  )}
                  {/* Nome e Categoria */}
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {aircraft.name}
                    </h3>
                    <p className="text-sm text-slate-400 capitalize">{aircraft.category}</p>
                  </div>

                  {/* Visualização 3D da Aeronave */}
                  <div className="h-32 mb-4 flex items-center justify-center">
                    <div 
                      className={`
                        w-24 h-24 rounded-lg flex items-center justify-center transition-all duration-300 relative overflow-hidden
                        ${isSelected 
                          ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-white/30 shadow-lg' 
                          : aircraft.isUnlocked
                            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600'
                            : 'bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700'
                        }
                      `}
                      style={isSelected ? { borderColor: aircraft.color } : {}}
                    >
                      {/* Visualização 3D da aeronave */}
                      {aircraft.model_3d_code || aircraft.model_3d_file_url ? (
                        <div className="w-full h-full">
                          <HangarScene 
                            modelCode={aircraft.model_3d_code}
                            modelUrl={aircraft.model_3d_file_url}
                            color={aircraft.color}
                            isSelected={isSelected}
                          />
                        </div>
                      ) : (
                        <div 
                          className={`
                            text-4xl transition-all duration-300
                            ${isSelected ? 'drop-shadow-lg' : ''}
                            ${!aircraft.isUnlocked ? 'grayscale opacity-50' : ''}
                          `}
                          style={{ 
                            color: isSelected ? aircraft.color : aircraft.isUnlocked ? aircraft.color : '#64748b',
                            filter: isSelected ? `drop-shadow(0 0 10px ${aircraft.color}40)` : ''
                          }}
                        >
                          ✈️
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">VELOCIDADE</span>
                      <span className="text-white font-bold">{aircraft.stats.speed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">DURABILIDADE</span>
                      <span className="text-white font-bold">{aircraft.stats.durability}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">MANOBRABILIDADE</span>
                      <span className="text-white font-bold">{aircraft.stats.agility}</span>
                    </div>
                  </div>

                  {/* Preço Flygold */}
                  {aircraft.price_flygold && !aircraft.isUnlocked && (
                    <div className="mb-4 p-2 bg-gradient-to-r from-amber-600/20 to-amber-500/20 rounded-lg border border-amber-500/30">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-amber-400 text-lg">⚙️</span>
                        <span className="text-amber-300 font-bold text-sm">
                          {aircraft.price_flygold.toLocaleString()} Flygold
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status de Bloqueio */}
                  {!aircraft.isUnlocked && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      {aircraft.price_flygold ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePurchase(aircraft)
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-lg transition-all shadow-lg"
                        >
                          COMPRAR
                        </button>
                      ) : (
                        <div className="text-center">
                          <div className="text-4xl mb-2">🔒</div>
                          <p className="text-white font-bold">BLOQUEADO</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Botão Próximo */}
        <button
          onClick={handleNext}
          className="absolute right-8 z-10 w-12 h-12 bg-slate-700/50 hover:bg-slate-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          →
        </button>
      </div>

      {/* Área de Detalhes da Aeronave Selecionada */}
      {selectedAircraft && (
        <div className="bg-slate-800/50 border-t border-slate-700 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">VELOCIDADE MÁX</p>
                <p className="text-white font-bold">{selectedAircraft.realSpecs.maxSpeed}</p>
              </div>
              <div>
                <p className="text-slate-400">ALCANCE</p>
                <p className="text-white font-bold">{selectedAircraft.realSpecs.range}</p>
              </div>
              <div>
                <p className="text-slate-400">TETO</p>
                <p className="text-white font-bold">{selectedAircraft.realSpecs.ceiling}</p>
              </div>
              <div>
                <p className="text-slate-400">FABRICANTE</p>
                <p className="text-white font-bold">{selectedAircraft.realSpecs.manufacturer}</p>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-slate-400 text-sm mb-1">ARMAMENTO</p>
              <p className="text-white">{selectedAircraft.realSpecs.armament}</p>
            </div>
          </div>
        </div>
      )}

      {/* Visualização 3D da Hangar */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-20 pointer-events-none">
        <HangarScene />
      </div>
    </div>
  )
}