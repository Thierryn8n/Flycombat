"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function AdminAircraftPage() {
  const [list, setList] = useState<any[]>([])
  const [search, setSearch] = useState("")
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from("aircraft").select("id,name,flygold_price,is_published,is_default,created_at").order("created_at", { ascending: false })
      setList(data || [])
    }
    load()
  }, [])
  return (
    <div className="h-full w-full">
      <div className="mx-auto max-w-7xl py-10 px-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Aeronaves</h1>
          <Link href="/admin/cad?new=1" className="px-3 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm">
            Criar Nova
          </Link>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="rounded border border-white/10 overflow-hidden">
          <div className="grid grid-cols-6 gap-2 text-xs text-slate-400 border-b border-white/10 px-3 py-2">
            <div>Nome</div>
            <div>Status</div>
            <div>Starter</div>
            <div>Preço</div>
            <div>Criado</div>
            <div></div>
          </div>
          <div className="divide-y divide-white/10">
            {list
              .filter((x) => x.name?.toLowerCase().includes(search.toLowerCase()))
              .map((x) => (
                <div key={x.id} className="grid grid-cols-6 gap-2 px-3 py-2 text-sm">
                  <div className="text-white">{x.name}</div>
                  <div className={x.is_published ? "text-emerald-400" : "text-slate-300"}>{x.is_published ? "Publicado" : "Rascunho"}</div>
                  <div className={x.is_default ? "text-emerald-400" : "text-slate-300"}>{x.is_default ? "Sim" : "Não"}</div>
                  <div className="text-orange-300">{x.flygold_price > 0 ? `${x.flygold_price} FG` : "Grátis"}</div>
                  <div className="text-slate-300">{new Date(x.created_at).toLocaleDateString("pt-BR")}</div>
                  <div className="text-right">
                    <Link href={`/admin/cad?aircraftId=${x.id}`} className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 text-white text-xs">
                      Editar no CAD
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
