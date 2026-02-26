"use client"

import { useState } from "react"
import { Aircraft } from "@/lib/game/types"

// Categorias aeronáuticas reais com ícones e cores temáticas
const AIRCRAFT_CATEGORIES = {
  FIGHTER: {
    id: "fighter",
    name: "CAÇAS",
    icon: "🛩️",
    description: "Superioridade Aérea",
    color: "from-gray-600 to-gray-800",
    borderColor: "border-gray-500",
    hoverColor: "hover:from-gray-500 hover:to-gray-700",
    examples: ["F-16", "F-22", "Su-35", "Mirage 2000"]
  },
  BOMBER: {
    id: "bomber", 
    name: "BOMBARDEIROS",
    icon: "💣",
    description: "Ataque ao Solo",
    color: "from-green-700 to-green-900",
    borderColor: "border-green-600",
    hoverColor: "hover:from-green-600 hover:to-green-800",
    examples: ["B-52", "Tu-95", "B-2", "FB-111"]
  },
  ATTACK: {
    id: "attack",
    name: "ATAQUE",
    icon: "🎯",
    description: "Apoio Aéreo Proximo",
    color: "from-red-700 to-red-900",
    borderColor: "border-red-600", 
    hoverColor: "hover:from-red-600 hover:to-red-800",
    examples: ["A-10", "Su-25", "Harrier", "AMX"]
  },
  HELICOPTER: {
    id: "helicopter",
    name: "HELICÓPTEROS",
    icon: "🚁",
    description: "Asa Rotativa",
    color: "from-blue-700 to-blue-900",
    borderColor: "border-blue-600",
    hoverColor: "hover:from-blue-600 hover:to-blue-800",
    examples: ["Apache", "Mi-24", "Cobra", "Tiger"]
  },
  TRANSPORT: {
    id: "transport",
    name: "TRANSPORTE",
    icon: "📦",
    description: "Logística & Carga",
    color: "from-yellow-700 to-yellow-900",
    borderColor: "border-yellow-600",
    hoverColor: "hover:from-yellow-600 hover:to-yellow-800",
    examples: ["C-130", "An-124", "A400M", "KC-135"]
  },
  DRONE: {
    id: "drone",
    name: "DRONES",
    icon: "🎯",
    description: "Combate Remoto",
    color: "from-purple-700 to-purple-900",
    borderColor: "border-purple-600",
    hoverColor: "hover:from-purple-600 hover:to-purple-800",
    examples: ["Predator", "Reaper", "Global Hawk", "Hermes"]
  }
}

interface HangarCategoriesProps {
  onCategorySelect: (category: string) => void
  selectedCategory: string | null
  aircraftCountByCategory: Record<string, number>
}

export function HangarCategories({ 
  onCategorySelect, 
  selectedCategory,
  aircraftCountByCategory 
}: HangarCategoriesProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Título Principal */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2 tracking-wider">
          HANGAR AERONÁUTICO
        </h1>
        <p className="text-white/70 text-lg">
          Selecione uma categoria para explorar nossa frota
        </p>
      </div>

      {/* Grid de Categorias - BOTÕES GRANDES */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        {Object.values(AIRCRAFT_CATEGORIES).map((category) => {
          const count = aircraftCountByCategory[category.id] || 0
          const isSelected = selectedCategory === category.id
          const isHovered = hoveredCategory === category.id
          
          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              onMouseEnter={() => setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`
                relative group p-8 rounded-2xl border-3 transition-all duration-300 transform
                bg-gradient-to-br ${category.color} ${category.borderColor}
                ${category.hoverColor}
                ${isSelected 
                  ? 'ring-4 ring-white scale-105 shadow-2xl shadow-white/30' 
                  : 'hover:scale-102 hover:shadow-xl'
                }
                ${count === 0 ? 'opacity-60 grayscale' : ''}
              `}
            >
              {/* Ícone Principal - GRANDE */}
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {category.icon}
              </div>
              
              {/* Nome da Categoria */}
              <h3 className="text-2xl font-black text-white mb-2 tracking-wider">
                {category.name}
              </h3>
              
              {/* Descrição */}
              <p className="text-white/80 text-sm mb-4">
                {category.description}
              </p>
              
              {/* Contador de Aeronaves */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
                <span className="text-white/70 text-sm">
                  {count === 1 ? 'Aeronave' : 'Aeronaves'}
                </span>
              </div>
              
              {/* Exemplos de Modelos */}
              <div className="text-xs text-white/60">
                <p className="mb-1 font-semibold">Modelos:</p>
                <p>{category.examples.join(', ')}</p>
              </div>
              
              {/* Estado de Indisponível */}
              {count === 0 && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <p className="text-white font-bold">EM BREVE</p>
                  </div>
                </div>
              )}
              
              {/* Efeito de Hover */}
              {isHovered && count > 0 && (
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-gray-800 font-bold">GO</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Painel de Informações */}
      <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">ℹ️</span>
          Informações do Hangar
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Disponível para seleção</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Aeronave selecionada atualmente</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Categoria em desenvolvimento</span>
          </div>
        </div>
      </div>
    </div>
  )
}