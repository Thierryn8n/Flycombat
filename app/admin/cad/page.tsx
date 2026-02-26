"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import EditorToolbar from "@/components/editor-toolbar"
import ScenePanel from "@/components/scene-panel"
import PropertiesPanel from "@/components/properties-panel"
import { type AircraftPart, type Aircraft, PART_TYPE_COLORS, PART_TYPE_LABELS } from "@/lib/aircraft-database"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, Plane, LogOut, Gamepad2, Home, Save, Database } from "lucide-react"
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

function safeParseJson(value: unknown) {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export default function AdminEditorPage() {
  const [parts, setParts] = useState<PartWithUid[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [styleClipboard, setStyleClipboard] = useState<Partial<AircraftPart> | null>(null)
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
  const searchParams = useSearchParams()
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [search, setSearch] = useState("")
  const [enableShortcuts, setEnableShortcuts] = useState(false)
  const [transformMode, setTransformMode] = useState<"none" | "rotate" | "translate">("translate")
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
    const preId = searchParams.get("aircraftId")
    const createNew = searchParams.get("new")
    if (createNew === "1") {
      setShowOnboarding(false)
      return
    }
    if (preId && data) {
      const ac = data.find((x: any) => x.id === preId)
      if (ac) {
        selectDbAircraft(ac)
        setShowOnboarding(false)
      }
    }
  }

  async function saveToDatabase() {
    if (!user?.id) return
    setSaving(true)
    const supabase = createClient()
    const partsData = parts.map(({ uid, ...rest }) => rest)
    
    const fullAircraftObject = {
      id: currentAircraftId || undefined,
      name: currentAircraftName,
      parts: partsData,
      specs: {
        maxSpeed: baseSpeed,
        durability: baseHealth,
        firepower: baseDamage,
        armor: baseArmor
      },
      flygold_price: priceFlygold,
      is_default: isStarter,
      is_published: isPublished,
      created_by: user.id
    }

    const aircraftData = {
      name: currentAircraftName,
      parts_json: partsData,
      full_code_json: fullAircraftObject,
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

  const updatePartLive = useCallback(
    (uid: string, updates: Partial<AircraftPart>) => {
      setParts((p) => p.map((part) => (part.uid === uid ? { ...part, ...updates } : part)))
    },
    []
  )

  const copyStyle = useCallback(
    (uid: string) => {
      const part = parts.find((p) => p.uid === uid)
      if (!part) return
      const style: Partial<AircraftPart> = {
        color: part.color,
        opacity: part.opacity,
        shape: part.shape,
        sweepDeg: part.sweepDeg,
        taper: part.taper,
        tipAxis: part.tipAxis,
        tipTaper: part.tipTaper,
        tipRound: part.tipRound,
      }
      setStyleClipboard(style)
      notify("Estilo copiado", "success")
    },
    [parts, notify]
  )

  const applyStyleToType = useCallback(
    (uid: string) => {
      if (!styleClipboard) {
        notify("Nenhum estilo copiado", "error")
        return
      }
      const part = parts.find((p) => p.uid === uid)
      if (!part) return
      pushHistory(parts)
      setParts((p) => p.map((item) => (item.type === part.type ? { ...item, ...styleClipboard } : item)))
      notify("Estilo aplicado no mesmo tipo", "success")
    },
    [parts, styleClipboard, pushHistory, notify]
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
          const importedParts = Array.isArray(data.parts) ? data.parts : (Array.isArray(data) ? data : [])
          if (importedParts.length > 0) {
            pushHistory(parts)
            const newParts = importedParts.map((p: AircraftPart) => ({ ...p, uid: generateUid(p.id) }))
            setParts(newParts)
            setSelectedIds([])
            if (data.name) setCurrentAircraftName(data.name)
            if (data.specs) {
               if (data.specs.maxSpeed) setBaseSpeed(data.specs.maxSpeed)
               if (data.specs.thrust) setBaseDamage(Math.min(100, data.specs.thrust / 500)) 
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
  const selectByIds = useCallback((ids: string[]) => {
    setSelectedIds(ids)
    if (ids.length) notify(`${ids.length} partes selecionadas`, "info")
  }, [notify])

  useEffect(() => {
    if (!enableShortcuts) return
    const handler = (e: KeyboardEvent) => {
      try {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === "z") { e.preventDefault(); undo() }
          if (e.key === "y") { e.preventDefault(); redo() }
          if (e.key === "d") { e.preventDefault(); cloneSelected() }
          if (e.key === "s") { e.preventDefault(); saveToDatabase() }
          if (e.key.toLowerCase() === "a") {
            e.preventDefault()
            selectByIds(visibleParts.map((p) => p.uid))
          }
        }
        if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement?.tagName !== "INPUT") {
          deleteSelected()
        }
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
      } catch (err) {
        console.error("Shortcut handler error:", err)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [enableShortcuts, visibleParts, undo, redo, cloneSelected, saveToDatabase, deleteSelected, moveSelected, rotateSelected, notify])

  function selectDbAircraft(ac: any) {
    let partsData = ac.parts_json
    let specsData = null
    if (ac.full_code_json) {
      const fullCode = safeParseJson(ac.full_code_json)
      if (fullCode && typeof fullCode === "object") {
        if ((fullCode as any).parts) partsData = (fullCode as any).parts
        if ((fullCode as any).specs) specsData = (fullCode as any).specs
      }
    } else if (typeof partsData === "string") {
      const parsed = safeParseJson(partsData)
      if (parsed && typeof parsed === "object" && (parsed as any).parts) {
        specsData = (parsed as any).specs
        partsData = (parsed as any).parts
      } else if (Array.isArray(parsed)) {
        partsData = parsed
      }
    } else if (partsData && !Array.isArray(partsData) && (partsData as any).parts) {
      specsData = (partsData as any).specs
      partsData = (partsData as any).parts
    }
    if (partsData && Array.isArray(partsData)) {
      loadAircraft({ id: ac.id, name: ac.name, year: 2024, parts: partsData })
      setCurrentAircraftId(ac.id)
      setPriceFlygold(ac.flygold_price || 0)
      setIsStarter(ac.is_default || false)
      setIsPublished(ac.is_published || false)
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
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFileImport} />

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
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={enableShortcuts}
              onChange={(e) => setEnableShortcuts(e.target.checked)}
            />
            Atalhos (mover/rotacionar)
          </label>
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
                        if (ac.full_code_json) {
                           const fullCode = safeParseJson(ac.full_code_json)
                           if (fullCode && typeof fullCode === "object") {
                              if ((fullCode as any).parts) partsData = (fullCode as any).parts;
                              if ((fullCode as any).specs) specsData = (fullCode as any).specs;
                           }
                        } 
                        else if (typeof partsData === "string") {
                           const parsed = safeParseJson(partsData)
                           if (parsed && typeof parsed === "object" && (parsed as any).parts) {
                              specsData = (parsed as any).specs
                              partsData = (parsed as any).parts
                           } else if (Array.isArray(parsed)) {
                              partsData = parsed
                           }
                        }
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
              onSelectIds={selectByIds}
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
              onUpdatePart={updatePart}
              onUpdatePartLive={updatePartLive}
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
              onMirrorSelected={(axis) => {
                mirrorSelected(axis)
              }}
              onCopyStyle={copyStyle}
              onApplyStyleToType={applyStyleToType}
              onMoveSelected={moveSelected}
              onRotateSelected={rotateSelected}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {showOnboarding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[720px] max-w-[95vw] bg-black border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold text-white">Selecionar Aeronave</div>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                fechar
              </button>
            </div>
            <div className="text-xs text-slate-400 mb-4">
              Escolha uma aeronave para modificar ou crie uma nova.
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              />
              <button
                onClick={() => {
                  setParts([])
                  setCurrentAircraftName("Novo Projeto")
                  setCurrentAircraftId(null)
                  setPriceFlygold(0)
                  setIsStarter(false)
                  setIsPublished(false)
                  setResetTrigger(t => t+1)
                  setShowOnboarding(false)
                }}
                className="px-3 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm"
              >
                Criar Nova
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded border border-white/10">
              {(dbAircraft || [])
                .filter((ac: any) => ac.name?.toLowerCase().includes(search.toLowerCase()))
                .map((ac: any) => (
                  <button
                    key={ac.id}
                    onClick={() => {
                      selectDbAircraft(ac)
                      setShowOnboarding(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 border-b border-white/5 flex items-center justify-between"
                  >
                    <span className="text-white">{ac.name}</span>
                    <span className="text-[10px] text-slate-400">{ac.flygold_price > 0 ? `${ac.flygold_price} FG` : "Grátis"}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
