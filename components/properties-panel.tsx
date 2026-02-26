"use client"

import { useCallback, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { PART_TYPES, PART_TYPE_COLORS, PART_TYPE_LABELS, type AircraftPart } from "@/lib/aircraft-database"
import { Trash2, Copy, FlipHorizontal } from "lucide-react"

function RotationDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const update = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(clientY - cy, clientX - cx)
    let deg = (angle * 180) / Math.PI + 90
    deg = (deg + 360) % 360
    if (deg > 180) deg -= 360
    const snapped = Math.round(deg / 5) * 5
    onChange(snapped)
  }, [onChange])
  return (
    <div
      ref={ref}
      className="relative size-14 rounded-full border border-border bg-muted/30"
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        update(e.clientX, e.clientY)
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <div className="absolute inset-1 rounded-full border border-border/50" />
      <div
        className="absolute left-1/2 top-1/2 h-5 w-0.5 bg-primary/80 origin-bottom"
        style={{ transform: `translate(-50%, -100%) rotate(${value}deg)` }}
      />
      <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
    </div>
  )
}

export default function PropertiesPanel({
  parts,
  selectedIds,
  onUpdatePart,
  onDeleteSelected,
  onCloneSelected,
  onMirrorSelected,
  onCopyStyle,
  onApplyStyleToType,
  onMoveSelected,
  onRotateSelected,
}: {
  parts: (AircraftPart & { uid: string })[]
  selectedIds: string[]
  onUpdatePart: (uid: string, updates: Partial<AircraftPart>) => void
  onDeleteSelected: () => void
  onCloneSelected: () => void
  onMirrorSelected: (axis: "x" | "y" | "z") => void
  onCopyStyle?: (uid: string) => void
  onApplyStyleToType?: (uid: string) => void
  onMoveSelected?: (dx: number, dy: number, dz: number) => void
  onRotateSelected?: (rx: number, ry: number, rz: number) => void
}) {
  const selected = parts.filter((p) => selectedIds.includes(p.uid))

  if (selected.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p className="text-sm font-medium">Nenhuma parte selecionada</p>
        <p className="text-xs mt-1">Clique em uma parte no viewport 3D</p>
      </div>
    )
  }

  if (selected.length > 1) {
    const moveStep = 0.5
    const rotateStep = 5
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm font-medium text-foreground">
          {selected.length} partes selecionadas
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={onDeleteSelected} className="flex-1">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Deletar
          </Button>
          <Button size="sm" variant="secondary" onClick={onCloneSelected} className="flex-1">
            <Copy className="w-3.5 h-3.5 mr-1" /> Clonar
          </Button>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Espelhar em</Label>
          <div className="flex gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <Button
                key={axis}
                size="sm"
                variant="outline"
                onClick={() => onMirrorSelected(axis)}
                className="flex-1"
              >
                <FlipHorizontal className="w-3 h-3 mr-1" /> {axis.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        {(onMoveSelected || onRotateSelected) && <Separator />}
        {onMoveSelected && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Mover</Label>
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <Label className="w-5 text-xs font-mono text-muted-foreground">{axis.toUpperCase()}</Label>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  onMoveSelected(axis === "x" ? -moveStep : 0, axis === "y" ? -moveStep : 0, axis === "z" ? -moveStep : 0)
                }}>
                  -
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  onMoveSelected(axis === "x" ? moveStep : 0, axis === "y" ? moveStep : 0, axis === "z" ? moveStep : 0)
                }}>
                  +
                </Button>
              </div>
            ))}
          </div>
        )}
        {onRotateSelected && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Rotacao</Label>
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <Label className="w-5 text-xs font-mono text-muted-foreground">{axis.toUpperCase()}</Label>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  onRotateSelected(axis === "x" ? -rotateStep : 0, axis === "y" ? -rotateStep : 0, axis === "z" ? -rotateStep : 0)
                }}>
                  -
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  onRotateSelected(axis === "x" ? rotateStep : 0, axis === "y" ? rotateStep : 0, axis === "z" ? rotateStep : 0)
                }}>
                  +
                </Button>
              </div>
            ))}
          </div>
        )}
        <Separator />
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {selected.map((p) => (
              <div
                key={p.uid}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-muted/50"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: PART_TYPE_COLORS[p.type] || "#6B7280" }}
                />
                <span className="truncate text-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  const part = selected[0]

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Propriedades</h3>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCloneSelected}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDeleteSelected}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input
              value={part.label}
              onChange={(e) => onUpdatePart(part.uid, { label: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={part.type} onValueChange={(v) => onUpdatePart(part.uid, { type: v })}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PART_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: PART_TYPE_COLORS[t] }}
                      />
                      {PART_TYPE_LABELS[t] || t.replace(/_/g, " ")}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={part.color}
                onChange={(e) => onUpdatePart(part.uid, { color: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={part.color}
                onChange={(e) => onUpdatePart(part.uid, { color: e.target.value })}
                className="h-8 text-xs flex-1 font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => onCopyStyle?.(part.uid)}>
              Copiar estilo
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onApplyStyleToType?.(part.uid)}>
              Aplicar no mesmo tipo
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Posicao (metros)
          </h4>
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis} className="flex items-center gap-2">
              <Label className="w-4 text-xs font-mono font-bold text-muted-foreground">
                {axis.toUpperCase()}
              </Label>
              <Slider
                value={[part[axis]]}
                onValueChange={([v]) => onUpdatePart(part.uid, { [axis]: v })}
                min={-30}
                max={30}
                step={0.1}
                className="flex-1"
              />
              <Input
                type="number"
                step={0.1}
                value={part[axis]}
                onChange={(e) => onUpdatePart(part.uid, { [axis]: parseFloat(e.target.value) || 0 })}
                className="w-16 h-7 text-xs font-mono"
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Dimensoes (metros)
          </h4>
          {([
            { key: "w", label: "Largura" },
            { key: "h", label: "Altura" },
            { key: "d", label: "Prof." },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Label className="w-12 text-xs text-muted-foreground">{label}</Label>
              <Slider
                value={[part[key]]}
                onValueChange={([v]) => onUpdatePart(part.uid, { [key]: Math.max(0.01, v) })}
                min={0.01}
                max={30}
                step={0.05}
                className="flex-1"
              />
              <Input
                type="number"
                step={0.05}
                value={part[key]}
                onChange={(e) =>
                  onUpdatePart(part.uid, { [key]: Math.max(0.01, parseFloat(e.target.value) || 0.01) })
                }
                className="w-16 h-7 text-xs font-mono"
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ponta
          </h4>
          <div>
            <Label className="text-xs text-muted-foreground">Eixo</Label>
            <Select
              value={part.tipAxis || "none"}
              onValueChange={(v) => onUpdatePart(part.uid, { tipAxis: v === "none" ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                <SelectItem value="x+" className="text-xs">X+</SelectItem>
                <SelectItem value="x-" className="text-xs">X-</SelectItem>
                <SelectItem value="y+" className="text-xs">Y+</SelectItem>
                <SelectItem value="y-" className="text-xs">Y-</SelectItem>
                <SelectItem value="z+" className="text-xs">Z+</SelectItem>
                <SelectItem value="z-" className="text-xs">Z-</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-16 text-xs text-muted-foreground">Afunilar</Label>
            <Slider
              value={[part.tipTaper ?? 0]}
              onValueChange={([v]) => onUpdatePart(part.uid, { tipTaper: v })}
              min={0}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <Input
              type="number"
              step={0.05}
              value={part.tipTaper ?? 0}
              onChange={(e) => onUpdatePart(part.uid, { tipTaper: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
              className="w-16 h-7 text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-16 text-xs text-muted-foreground">Arred.</Label>
            <Slider
              value={[part.tipRound ?? 0]}
              onValueChange={([v]) => onUpdatePart(part.uid, { tipRound: v })}
              min={0}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <Input
              type="number"
              step={0.05}
              value={part.tipRound ?? 0}
              onChange={(e) => onUpdatePart(part.uid, { tipRound: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
              className="w-16 h-7 text-xs font-mono"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Rotacao (graus)
          </h4>
          {([
            { key: "rotationX", label: "RX" },
            { key: "rotationY", label: "RY" },
            { key: "rotationZ", label: "RZ" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Label className="w-6 text-xs font-mono text-muted-foreground">{label}</Label>
              <Slider
                value={[part[key] || 0]}
                onValueChange={([v]) => onUpdatePart(part.uid, { [key]: Math.round(v / 5) * 5 })}
                min={-180}
                max={180}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                step={5}
                value={part[key] || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  onUpdatePart(part.uid, { [key]: Math.round(value / 5) * 5 })
                }}
                className="w-16 h-7 text-xs font-mono"
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: "rotationX", label: "RX" },
              { key: "rotationY", label: "RY" },
              { key: "rotationZ", label: "RZ" },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <RotationDial
                  value={part[key] || 0}
                  onChange={(v) => onUpdatePart(part.uid, { [key]: v })}
                />
                <div className="text-[10px] text-muted-foreground">{part[key] || 0}°</div>
              </div>
            ))}
          </div>
        </div>

        {part.opacity !== undefined && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Opacidade
              </h4>
              <Slider
                value={[part.opacity]}
                onValueChange={([v]) => onUpdatePart(part.uid, { opacity: v })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Espelhar</Label>
          <div className="flex gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <Button
                key={axis}
                size="sm"
                variant="outline"
                onClick={() => onMirrorSelected(axis)}
                className="flex-1 text-xs"
              >
                <FlipHorizontal className="w-3 h-3 mr-1" /> {axis.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
