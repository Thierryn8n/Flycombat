"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import EditorToolbar from "@/components/editor-toolbar"
import ScenePanel from "@/components/scene-panel"
import PropertiesPanel from "@/components/properties-panel"
import { type AircraftPart, type Aircraft, PART_TYPE_COLORS, PART_TYPE_LABELS } from "@/lib/aircraft-database"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, Plane, LogOut, Gamepad2, Home, Save, Database } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import * as THREE from "three"

const Viewer3D = dynamic(() => import("@/components/viewer-3d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando viewport 3D...</span>
      </div>
    </div>
  ),
})

type PartWithUid = AircraftPart & { uid: string }

function generateUid(id: string) {
  return `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(14)
  const [usersCount, setUsersCount] = useState(0)
  const [ownedCount, setOwnedCount] = useState(0)
  const [tx, setTx] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const usersQ = await supabase.from("profiles").select("id,created_at")
      const ownedQ = await supabase.from("player_aircraft").select("id", { count: "exact", head: true })
      const txQ = await supabase.from("flygold_transactions").select("amount,type,created_at").order("created_at", { ascending: true })
      setUsersCount(usersQ.data?.length || 0)
      setUsers(usersQ.data || [])
      setOwnedCount(ownedQ.count || 0)
      setTx(txQ.data || [])
      setLoading(false)
    }
    load()
  }, [])
  const days = Array.from({ length: rangeDays }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (rangeDays - 1 - i))
    const k = d.toISOString().slice(0, 10)
    return { key: k, label: `${d.getDate()}/${d.getMonth() + 1}` }
  })
  const salesDaily = days.map((d) => {
    const sum = tx.filter(t => (t.type === "purchase") && (t.created_at?.slice(0,10) === d.key)).reduce((s, t) => s + (Number(t.amount) || 0), 0)
    return { day: d.label, value: sum }
  })
  const newUsersDaily = days.map((d) => {
    const count = users.filter(u => (u.created_at?.slice(0,10) === d.key)).length
    return { day: d.label, value: count }
  })
  const totalFG = tx.reduce((s, t) => s + (t.type === "purchase" ? Number(t.amount) || 0 : 0), 0)
  const totalBRL = (totalFG / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const txCount = tx.length
  return (
    <div className="h-full w-full bg-black text-white">
      <div className="mx-auto max-w-full py-6 px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              <Plane className="w-4 h-4 text-black" />
            </div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="bg-black border border-white/10 rounded px-2 py-1 text-sm"
            >
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
            </select>
            <Link href="/admin/cad">
              <Button className="bg-orange-600 hover:bg-orange-500">Editor CAD</Button>
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/10 bg-black/60 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
              <StatCard label="Usuários" value={usersCount.toLocaleString()} />
              <StatCard label="Aeronaves (owned)" value={ownedCount.toLocaleString()} />
              <StatCard label="Transações FG" value={txCount.toLocaleString()} />
              <StatCard label="Vendas (R$)" value={totalBRL} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 min-w-0">
              <div className="p-4 rounded-xl border border-white/10 bg-black/60">
                <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Vendas FlyGold (FG)</div>
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesDaily}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="day" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-black/60">
                <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Novos Usuários</div>
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={newUsersDaily}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="day" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-xl border border-white/10 bg-black/60 min-w-0">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">Últimas Transações</div>
              <div className="grid grid-cols-4 gap-2 text-xs text-slate-400 border-b border-white/10 pb-1">
                <div>Data</div>
                <div>Tipo</div>
                <div>FG</div>
                <div>R$</div>
              </div>
              <div className="divide-y divide-white/10">
                {tx.slice().reverse().slice(0, 10).map((t, i) => {
                  const d = new Date(t.created_at)
                  return (
                    <div key={i} className="grid grid-cols-4 gap-2 py-2 text-sm">
                      <div className="text-slate-300">{d.toLocaleDateString("pt-BR")} {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className={t.type === "purchase" ? "text-emerald-400" : "text-slate-300"}>{t.type}</div>
                      <div className="text-orange-300">{Number(t.amount || 0).toLocaleString()}</div>
                      <div className="text-slate-300">{(Number(t.amount || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
    </div>
  )
}

export default function AdminEditorPage() {
  return <AdminDashboard />
  const [parts, setParts] = useState<PartWithUid[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [history, setHistory] = useState<PartWithUid[][]>([])
  const [future, setFuture] = useState<PartWithUid[][]>([])
  const [wireMode, setWireMode] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [hiddenParts, setHiddenParts] = useState<Set<string>>(new Set())
  const [resetTrigger, setResetTrigger] = useState(0)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [currentAircraftName, setCurrentAircraftName] = useState("Novo Projeto")
  const [currentAircraftId, setCurrentAircraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [dbAircraft, setDbAircraft] = useState<Array<{ id: string; name: string; parts_json: unknown; full_code_json?: unknown; base_speed: number; base_health: number; flygold_price: number; is_published?: boolean; is_default?: boolean }>>([])
  const [baseSpeed, setBaseSpeed] = useState(100)
  const [baseHealth, setBaseHealth] = useState(100)
  const [baseDamage, setBaseDamage] = useState(10)
  const [baseArmor, setBaseArmor] = useState(5)
  const [priceFlygold, setPriceFlygold] = useState<number>(0)
  const [isPublished, setIsPublished] = useState<boolean>(false)
  const [isStarter, setIsStarter] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [transformMode, setTransformMode] = useState<"none" | "rotate" | "translate">("none")
  const transformBatchRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/auth/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()
      if (profile?.role !== "master" && profile?.role !== "admin") {
        router.push("/hangar")
        return
      }
      setUser({ email: data.user.email, id: data.user.id })
    })
    loadDbAircraft()
  }, [router])

  async function loadDbAircraft() {
    const supabase = createClient()
    const { data } = await supabase.from("aircraft").select("*").order("created_at", { ascending: false })
    if (data) setDbAircraft(data)
  }

  async function saveToDatabase() {
    if (!user?.id) return
    setSaving(true)
    const supabase = createClient()
    const partsData = parts.map(({ uid, ...rest }) => rest)
    
    // Create the "Complete Code" object structure
    const fullAircraftObject = {
      id: currentAircraftId || undefined, // Use existing ID if updating
      name: currentAircraftName,
      parts: partsData,
      specs: {
        maxSpeed: baseSpeed,
        // Map other stats to specs structure roughly
        durability: baseHealth,
        firepower: baseDamage,
        armor: baseArmor
      },
      // Include metadata
      flygold_price: priceFlygold,
      is_default: isStarter,
      is_published: isPublished,
      created_by: user.id
    }

    const aircraftData = {
      name: currentAircraftName,
      parts_json: partsData, // Just the parts array for rendering
      full_code_json: fullAircraftObject, // Saving the COMPLETE OBJECT here
      base_speed: baseSpeed,
      base_health: baseHealth,
      base_damage: baseDamage,
      base_armor: baseArmor,
      flygold_price: priceFlygold,
      is_default: isStarter,
      is_published: isPublished,
      created_by: user.id,
    }

    let error;
    if (currentAircraftId) {
       const { error: updateError } = await supabase
        .from("aircraft")
        .update(aircraftData)
        .eq("id", currentAircraftId)
       error = updateError
    } else {
       const { error: insertError } = await supabase
        .from("aircraft")
        .insert(aircraftData)
       error = insertError
    }

    if (error) {
      notify("Erro ao salvar: " + error.message, "error")
    } else {
      notify(currentAircraftId ? "Aeronave atualizada!" : "Aeronave criada!", "success")
      loadDbAircraft()
    }
    setSaving(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const notify = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const pushHistory = useCallback(
    (prev: PartWithUid[]) => {
      setHistory((h) => [...h.slice(-49), prev])
      setFuture([])
    },
    []
  )

  const undo = useCallback(() => {
    if (!history.length) return
    setFuture((f) => [parts, ...f.slice(0, 49)])
    setParts(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
    setSelectedIds([])
  }, [history, parts])

  const redo = useCallback(() => {
    if (!future.length) return
    setHistory((h) => [...h, parts])
    setParts(future[0])
    setFuture((f) => f.slice(1))
    setSelectedIds([])
  }, [future, parts])

  const loadAircraft = useCallback(
    (ac: Aircraft | any) => {
      pushHistory(parts)
      // Check if parts are in 'parts' property (full object) or direct array
      const partsArray = Array.isArray(ac.parts) ? ac.parts : (Array.isArray(ac) ? ac : [])
      
      const newParts = partsArray.map((p: AircraftPart) => ({
        ...p,
        uid: generateUid(p.id),
      }))
      setParts(newParts)
      setSelectedIds([])
      setHiddenParts(new Set())
      setCurrentAircraftName(ac.name || "Sem Nome")
      setResetTrigger((t) => t + 1)
      notify(`${ac.name || "Aeronave"} carregado com ${newParts.length} partes`, "success")
    },
    [parts, pushHistory, notify]
  )

  const addPart = useCallback(
    (type: string) => {
      pushHistory(parts)
      const uid = generateUid(type)
      const newPart: PartWithUid = {
        uid,
        id: `${type}_custom`,
        label: PART_TYPE_LABELS[type] || type.replace(/_/g, " ").toUpperCase(),
        type,
        x: 0,
        y: 0,
        z: 0,
        w: 2,
        h: 1,
        d: 1,
        color: PART_TYPE_COLORS[type] || "#6B7280",
      }
      setParts((p) => [...p, newPart])
      setSelectedIds([uid])
      notify(`${newPart.label} adicionado`, "success")
    },
    [parts, pushHistory, notify]
  )

  const selectPart = useCallback((uid: string, multi: boolean) => {
    if (!uid) {
      setSelectedIds([])
      return
    }
    if (multi) {
      setSelectedIds((prev) =>
        prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
      )
    } else {
      setSelectedIds([uid])
    }
  }, [])

  const updatePart = useCallback(
    (uid: string, updates: Partial<AircraftPart>) => {
      pushHistory(parts)
      setParts((p) => p.map((part) => (part.uid === uid ? { ...part, ...updates } : part)))
    },
    [parts, pushHistory]
  )

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return
    pushHistory(parts)
    setParts((p) => p.filter((x) => !selectedIds.includes(x.uid)))
    setSelectedIds([])
    notify(`${selectedIds.length} parte(s) deletada(s)`, "info")
  }, [selectedIds, parts, pushHistory, notify])

  const cloneSelected = useCallback(() => {
    if (!selectedIds.length) {
      notify("Selecione partes para clonar", "error")
      return
    }
    pushHistory(parts)
    const clones = selectedIds
      .map((uid) => {
        const p = parts.find((x) => x.uid === uid)
        if (!p) return null
        return { ...p, uid: generateUid(p.id), label: `${p.label} (copia)`, x: p.x + 1 }
      })
      .filter(Boolean) as PartWithUid[]
    setParts((p) => [...p, ...clones])
    setSelectedIds(clones.map((c) => c.uid))
    notify(`${clones.length} parte(s) clonada(s)`, "success")
  }, [selectedIds, parts, pushHistory, notify])

  const mirrorSelected = useCallback(
    (axis: "x" | "y" | "z") => {
      if (!selectedIds.length) {
        notify("Selecione partes para espelhar", "error")
        return
      }
      pushHistory(parts)
      const mirrors = selectedIds
        .map((uid) => {
          const p = parts.find((x) => x.uid === uid)
          if (!p) return null
          return {
            ...p,
            uid: generateUid(p.id),
            label: `${p.label} (mirror)`,
            x: axis === "x" ? -(p.x + p.w) : p.x,
            y: axis === "y" ? -(p.y + p.h) : p.y,
            z: axis === "z" ? -(p.z + p.d) : p.z,
          }
        })
        .filter(Boolean) as PartWithUid[]
      setParts((p) => [...p, ...mirrors])
      setSelectedIds(mirrors.map((m) => m.uid))
      notify(`Espelhado em ${axis.toUpperCase()}`, "success")
    },
    [selectedIds, parts, pushHistory, notify]
  )

  const rotateSelectionByQuaternion = useCallback((payload: { q: [number, number, number, number], center: [number, number, number] }, push = true) => {
    if (!selectedIds.length) return
    const delta = new THREE.Quaternion(payload.q[0], payload.q[1], payload.q[2], payload.q[3])
    const center = new THREE.Vector3(payload.center[0], payload.center[1], payload.center[2])
    if (push) pushHistory(parts)
    setParts((p) =>
      p.map((part) => {
        if (!selectedIds.includes(part.uid)) return part
        const w = Math.max(0.001, Number(part.w) || 1)
        const h = Math.max(0.001, Number(part.h) || 1)
        const d = Math.max(0.001, Number(part.d) || 1)
        const px = Number(part.x) || 0
        const py = Number(part.y) || 0
        const pz = Number(part.z) || 0
        const partCenter = new THREE.Vector3(px + w / 2, py + h / 2, pz + d / 2)
        partCenter.sub(center).applyQuaternion(delta).add(center)
        const baseEuler = new THREE.Euler(
          THREE.MathUtils.degToRad(Number(part.rotationX) || 0),
          THREE.MathUtils.degToRad(Number(part.rotationY) || 0),
          THREE.MathUtils.degToRad(Number(part.rotationZ) || 0),
          "XYZ"
        )
        const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler)
        baseQuat.premultiply(delta)
        const outEuler = new THREE.Euler().setFromQuaternion(baseQuat, "XYZ")
        const rx = Math.round(THREE.MathUtils.radToDeg(outEuler.x) / 5) * 5
        const ry = Math.round(THREE.MathUtils.radToDeg(outEuler.y) / 5) * 5
        const rz = Math.round(THREE.MathUtils.radToDeg(outEuler.z) / 5) * 5
        return {
          ...part,
          x: partCenter.x - w / 2,
          y: partCenter.y - h / 2,
          z: partCenter.z - d / 2,
          rotationX: rx,
          rotationY: ry,
          rotationZ: rz,
        }
      })
    )
  }, [selectedIds, parts, pushHistory])

  const translateSelectionByDelta = useCallback((delta: [number, number, number], push = true) => {
    if (!selectedIds.length) return
    if (push) pushHistory(parts)
    setParts((p) =>
      p.map((part) =>
        selectedIds.includes(part.uid)
          ? { ...part, x: (part.x || 0) + delta[0], y: (part.y || 0) + delta[1], z: (part.z || 0) + delta[2] }
          : part
      )
    )
  }, [selectedIds, parts, pushHistory])

  const moveSelected = useCallback((dx: number, dy: number, dz: number) => {
    translateSelectionByDelta([dx, dy, dz], true)
  }, [translateSelectionByDelta])

  const rotateSelected = useCallback((rx: number, ry: number, rz: number) => {
    if (!selectedIds.length) return
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(rx),
      THREE.MathUtils.degToRad(ry),
      THREE.MathUtils.degToRad(rz),
      "XYZ"
    ))
    const center = (() => {
      const selected = parts.filter((p) => selectedIds.includes(p.uid))
      if (!selected.length) return new THREE.Vector3(0, 0, 0)
      const sum = selected.reduce((acc, part) => {
        const w = Math.max(0.001, Number(part.w) || 1)
        const h = Math.max(0.001, Number(part.h) || 1)
        const d = Math.max(0.001, Number(part.d) || 1)
        const px = Number(part.x) || 0
        const py = Number(part.y) || 0
        const pz = Number(part.z) || 0
        acc.x += px + w / 2
        acc.y += py + h / 2
        acc.z += pz + d / 2
        return acc
      }, { x: 0, y: 0, z: 0 })
      return new THREE.Vector3(sum.x / selected.length, sum.y / selected.length, sum.z / selected.length)
    })()
    rotateSelectionByQuaternion({ q: [delta.x, delta.y, delta.z, delta.w], center: [center.x, center.y, center.z] }, true)
  }, [selectedIds, parts, rotateSelectionByQuaternion])

  const toggleVisibility = useCallback((uid: string) => {
    setHiddenParts((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }, [])

  const exportJSON = useCallback(() => {
    const data = JSON.stringify(
      { name: currentAircraftName, exportedAt: new Date().toISOString(), parts: parts.map(({ uid, ...rest }) => rest) },
      null, 2
    )
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "aircraft-export.json"
    a.click()
    URL.revokeObjectURL(url)
    notify("Projeto exportado", "success")
  }, [parts, currentAircraftName, notify])

  const importJSON = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          
          // Handle both "complete code" format and simple parts array
          const importedParts = Array.isArray(data.parts) ? data.parts : (Array.isArray(data) ? data : [])
          
          if (importedParts.length > 0) {
            pushHistory(parts)
            const newParts = importedParts.map((p: AircraftPart) => ({ ...p, uid: generateUid(p.id) }))
            setParts(newParts)
            setSelectedIds([])
            
            if (data.name) setCurrentAircraftName(data.name)
            
            // Import stats if available (F22.txt format)
            if (data.specs) {
               if (data.specs.maxSpeed) setBaseSpeed(data.specs.maxSpeed)
               // Map thrust to damage?
               if (data.specs.thrust) setBaseDamage(Math.min(100, data.specs.thrust / 500)) 
               // Map weight to health/armor?
               if (data.specs.emptyWeight) setBaseHealth(Math.min(1000, data.specs.emptyWeight / 20))
            }
            
            setResetTrigger((t) => t + 1)
            notify(`Importado ${newParts.length} partes`, "success")
          } else {
            notify("Nenhuma parte encontrada no arquivo", "error")
          }
        } catch {
          notify("Erro ao importar arquivo", "error")
        }
      }
      reader.readAsText(file)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [parts, pushHistory, notify]
  )

  const visibleParts = parts.filter((p) => !hiddenParts.has(p.uid))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); undo() }
        if (e.key === "y") { e.preventDefault(); redo() }
        if (e.key === "d") { e.preventDefault(); cloneSelected() }
        if (e.key === "s") { e.preventDefault(); saveToDatabase() }
        if (e.key.toLowerCase() === "a") {
          e.preventDefault()
          setSelectedIds(visibleParts.map((p) => p.uid))
          notify("Todas as partes selecionadas", "info")
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement?.tagName !== "INPUT") {
        deleteSelected()
      }
      // Nudge movement (setas) | Fast with Shift
      const step = e.shiftKey ? 1 : 0.2
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","PageUp","PageDown"].includes(e.key)) {
        e.preventDefault()
        if (e.key === "ArrowLeft") moveSelected(-step, 0, 0)
        if (e.key === "ArrowRight") moveSelected(step, 0, 0)
        if (e.key === "ArrowUp") moveSelected(0, step, 0)
        if (e.key === "ArrowDown") moveSelected(0, -step, 0)
        if (e.key === "PageUp") moveSelected(0, 0, -step)
        if (e.key === "PageDown") moveSelected(0, 0, step)
      }
      // Rotate shortcuts (Q/E yaw, R/F pitch, T/G roll)
      const rstep = e.shiftKey ? 10 : 5
      if (["q","e","r","f","t","g"].includes(e.key.toLowerCase())) {
        e.preventDefault()
        const k = e.key.toLowerCase()
        if (k === "q") rotateSelected(0, rstep, 0)
        if (k === "e") rotateSelected(0, -rstep, 0)
        if (k === "r") rotateSelected(rstep, 0, 0)
        if (k === "f") rotateSelected(-rstep, 0, 0)
        if (k === "t") rotateSelected(0, 0, rstep)
        if (k === "g") rotateSelected(0, 0, -rstep)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [undo, redo, cloneSelected, deleteSelected, moveSelected, rotateSelected, visibleParts, notify])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFileImport} />

      {/* Admin top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="text-sm font-bold">FlyCAD</span>
          </Link>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-secondary px-2 py-0.5 rounded">Admin</span>
          <span className="text-xs text-muted-foreground">|</span>
          <input
            type="text"
            value={currentAircraftName}
            onChange={(e) => setCurrentAircraftName(e.target.value)}
            className="text-sm bg-transparent border-none outline-none text-foreground font-medium w-48"
            placeholder="Nome do projeto..."
          />
          <span className="text-xs text-muted-foreground">|</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={priceFlygold}
              onChange={(e) => setPriceFlygold(Number(e.target.value))}
              className="w-24 bg-background border border-border rounded px-2 py-1 text-xs"
              placeholder="Preço (FlyGold)"
            />
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={isStarter}
                onChange={(e) => setIsStarter(e.target.checked)}
              />
              Gratis (starter)
            </label>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              Publicada
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveToDatabase} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar no BD
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/play" className="gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" />
              Jogar
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-1.5">
              <Home className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="w-8 h-8">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <EditorToolbar
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        hasSelection={selectedIds.length > 0}
        wireMode={wireMode}
        showGrid={showGrid}
        transformMode={transformMode}
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelected}
        onClone={cloneSelected}
        onToggleWire={() => setWireMode((w) => !w)}
        onToggleGrid={() => setShowGrid((g) => !g)}
        onSetTransformMode={setTransformMode}
        onResetCamera={() => setResetTrigger((t) => t + 1)}
        onExport={exportJSON}
        onImport={importJSON}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full bg-card border-r border-border overflow-hidden flex flex-col">
            {/* DB aircraft list */}
            {dbAircraft.length > 0 && (
              <div className="border-b border-border">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Banco de Dados</span>
                  </div>
                  <button 
                    onClick={() => {
                       setParts([])
                       setCurrentAircraftName("Novo Projeto")
                       setCurrentAircraftId(null)
                       setPriceFlygold(0)
                       setIsStarter(false)
                       setIsPublished(false)
                       setResetTrigger(t => t+1)
                    }}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    + Novo
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto px-2 pb-2">
                  {dbAircraft.map((ac) => (
                    <button
                      key={ac.id}
                      onClick={() => {
                        let partsData = ac.parts_json;
                        let specsData = null;

                        // Priority: Check full_code_json first
                        if (ac.full_code_json) {
                           const fullCode = typeof ac.full_code_json === 'string' 
                              ? JSON.parse(ac.full_code_json) 
                              : ac.full_code_json;
                           if (fullCode.parts) partsData = fullCode.parts;
                           if (fullCode.specs) specsData = fullCode.specs;
                        } 
                        // Fallback: Check if parts_json is the "Complete Code" object (legacy/migration)
                        else if (partsData && !Array.isArray(partsData) && (partsData as any).parts) {
                            specsData = (partsData as any).specs;
                            partsData = (partsData as any).parts;
                        }

                        if (partsData && Array.isArray(partsData)) {
                          loadAircraft({ id: ac.id, name: ac.name, year: 2024, parts: partsData })
                          setCurrentAircraftId(ac.id)
                          setPriceFlygold(ac.flygold_price || 0)
                          setIsStarter(ac.is_default || false)
                          setIsPublished(ac.is_published || false)

                          // Load specs from JSON if available, otherwise from columns
                          if (specsData) {
                             setBaseSpeed(specsData.maxSpeed || ac.base_speed || 500)
                             setBaseHealth(specsData.durability || ac.base_health || 100)
                             setBaseDamage(specsData.firepower || ac.base_damage || 20)
                             setBaseArmor(specsData.armor || ac.base_armor || 0)
                          } else {
                             setBaseSpeed(ac.base_speed || 500)
                             setBaseHealth(ac.base_health || 100)
                             setBaseDamage(ac.base_damage || 20)
                             setBaseArmor(ac.base_armor || 0)
                          }
                        }
                      }}
                      className={`w-full text-left px-2 py-1 text-xs rounded transition-colors truncate mb-1 ${
                        currentAircraftId === ac.id ? "bg-blue-900/30 text-blue-200 border border-blue-800" : "hover:bg-secondary text-foreground"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                         <span>{ac.name}</span>
                         {ac.is_published && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                         <span>{ac.flygold_price > 0 ? `${ac.flygold_price} FG` : "Grátis"}</span>
                         <span>{ac.is_default ? "Starter" : ""}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <ScenePanel
                parts={parts}
                selectedIds={selectedIds}
                onSelectPart={selectPart}
                onLoadAircraft={loadAircraft}
                onAddPart={addPart}
                hiddenParts={hiddenParts}
                onToggleVisibility={toggleVisibility}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={55}>
          <div className="h-full relative bg-background">
            <Viewer3D
              parts={visibleParts}
              selectedIds={selectedIds}
              onSelectPart={selectPart}
              onRotateSelection={(payload) => rotateSelectionByQuaternion(payload, false)}
              onTranslateSelection={(delta) => translateSelectionByDelta(delta, false)}
              onTransformStart={() => {
                if (!transformBatchRef.current) {
                  pushHistory(parts)
                  transformBatchRef.current = true
                }
              }}
              onTransformEnd={() => {
                transformBatchRef.current = false
              }}
              transformMode={transformMode}
              wireMode={wireMode}
              showGrid={showGrid}
              resetTrigger={resetTrigger}
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1 bg-card/80 backdrop-blur-sm border-t border-border text-[10px] text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Partes: {parts.length}</span>
                <span>Visiveis: {visibleParts.length}</span>
                <span>Selecionadas: {selectedIds.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Ctrl+Z: Desfazer</span>
                <span>Ctrl+S: Salvar BD</span>
                <span>Ctrl+D: Clonar</span>
                <span>Del: Deletar</span>
              </div>
            </div>
            {notification && (
              <div className={`absolute top-3 right-3 px-4 py-2 rounded-lg text-xs font-medium border backdrop-blur-sm transition-all ${
                notification.type === "success" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : notification.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}>
                {notification.message}
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <div className="h-full bg-card border-l border-border">
            <div className="px-4 py-2 border-b border-border">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Propriedades</h2>
            </div>
            <PropertiesPanel
              parts={parts}
              selectedIds={selectedIds}
              onUpdatePart={updatePart}
              onDeleteSelected={deleteSelected}
              onCloneSelected={cloneSelected}
              onMirrorSelected={mirrorSelected}
              onMoveSelected={moveSelected}
              onRotateSelected={rotateSelected}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
