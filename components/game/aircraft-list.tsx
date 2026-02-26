'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAllAircrafts } from '@/lib/aircrafts'

interface Aircraft {
  id: string
  name: string
  model: string
  manufacturer: string
  year: number
  max_speed: string
  range: string
  capacity: number
  engine_type: string
  weight: string
  dimensions: {
    length: string
    wingspan: string
    height: string
  }
  model_3d_code: string | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export default function AircraftList() {
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAircrafts()
  }, [])

  const loadAircrafts = async () => {
    try {
      setLoading(true)
      const data = await getAllAircrafts()
      setAircrafts(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar aeronaves:', err)
      setError('Erro ao carregar aeronaves')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando aeronaves...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={loadAircrafts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  if (aircrafts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400 mb-4">Nenhuma aeronave disponível</div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {aircrafts.map((aircraft) => (
        <Link
          key={aircraft.id}
          href={`/aircrafts/${aircraft.id}`}
          className="group bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
        >
          {/* Imagem/Thumbnail */}
          <div className="aspect-video bg-slate-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
            {aircraft.thumbnail_url ? (
              <img
                src={aircraft.thumbnail_url}
                alt={aircraft.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="text-slate-400 text-6xl group-hover:scale-110 transition-transform duration-300">
                ✈️
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {aircraft.name}
              </h3>
              {aircraft.model_3d_code && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                  3D
                </span>
              )}
            </div>

            <p className="text-slate-400 text-sm">{aircraft.manufacturer} • {aircraft.year}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Velocidade</p>
                <p className="text-white font-semibold">{aircraft.max_speed}</p>
              </div>
              <div>
                <p className="text-slate-500">Alcance</p>
                <p className="text-white font-semibold">{aircraft.range}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Capacidade</span>
                <span className="text-white font-semibold">{aircraft.capacity} piloto(s)</span>
              </div>
            </div>
          </div>

          {/* Botão de ação */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Inspecionar Aeronave
            </button>
          </div>
        </Link>
      ))}
    </div>
  )
}