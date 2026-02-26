"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Grid3X3,
  Box,
  Eye,
  RotateCcw,
  Download,
  Upload,
  Sun,
  Moon,
  Plane,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface ToolbarAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}

export default function EditorToolbar({
  canUndo,
  canRedo,
  hasSelection,
  wireMode,
  showGrid,
  transformMode = "none",
  onUndo,
  onRedo,
  onDelete,
  onClone,
  onToggleWire,
  onToggleGrid,
  onSetTransformMode,
  onResetCamera,
  onExport,
  onImport,
}: {
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  wireMode: boolean
  showGrid: boolean
  transformMode?: "none" | "rotate" | "translate"
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onClone: () => void
  onToggleWire: () => void
  onToggleGrid: () => void
  onSetTransformMode?: (mode: "none" | "rotate" | "translate") => void
  onResetCamera: () => void
  onExport: () => void
  onImport: () => void
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const groups: ToolbarAction[][] = [
    [
      { icon: <Undo2 className="w-4 h-4" />, label: "Desfazer (Ctrl+Z)", onClick: onUndo, disabled: !canUndo },
      { icon: <Redo2 className="w-4 h-4" />, label: "Refazer (Ctrl+Y)", onClick: onRedo, disabled: !canRedo },
    ],
    [
      { icon: <Copy className="w-4 h-4" />, label: "Clonar (Ctrl+D)", onClick: onClone, disabled: !hasSelection },
      { icon: <Trash2 className="w-4 h-4" />, label: "Deletar (Del)", onClick: onDelete, disabled: !hasSelection },
    ],
    [
      { icon: <Box className="w-4 h-4" />, label: "Wireframe", onClick: onToggleWire, active: wireMode },
      { icon: <Grid3X3 className="w-4 h-4" />, label: "Grid", onClick: onToggleGrid, active: showGrid },
    ],
    [
      ...(onSetTransformMode
        ? [
            {
              icon: <Plane className="w-4 h-4" />,
              label: "Mover",
              onClick: () => onSetTransformMode(transformMode === "translate" ? "none" : "translate"),
              active: transformMode === "translate",
              disabled: !hasSelection,
            },
            {
              icon: <RotateCcw className="w-4 h-4" />,
              label: "Rotacionar",
              onClick: () => onSetTransformMode(transformMode === "rotate" ? "none" : "rotate"),
              active: transformMode === "rotate",
              disabled: !hasSelection,
            },
          ]
        : []),
    ],
    [
      { icon: <RotateCcw className="w-4 h-4" />, label: "Reset Camera", onClick: onResetCamera },
    ],
    [
      { icon: <Download className="w-4 h-4" />, label: "Exportar JSON", onClick: onExport },
      { icon: <Upload className="w-4 h-4" />, label: "Importar JSON", onClick: onImport },
    ],
    [
      {
        icon: mounted ? (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Sun className="w-4 h-4" />,
        label: mounted ? (theme === "dark" ? "Tema Claro" : "Tema Escuro") : "Tema",
        onClick: () => mounted && setTheme(theme === "dark" ? "light" : "dark"),
      },
    ],
  ]

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card">
      <TooltipProvider delayDuration={200}>
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && <Separator orientation="vertical" className="h-6 mx-1" />}
            {group.map((action, ai) => (
              <Tooltip key={ai}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.active ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {action.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </TooltipProvider>
    </div>
  )
}
