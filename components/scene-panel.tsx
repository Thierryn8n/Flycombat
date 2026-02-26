"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AIRCRAFT_DATABASE,
  PART_TYPES,
  PART_TYPE_COLORS,
  PART_TYPE_LABELS,
  type AircraftPart,
  type Aircraft,
} from "@/lib/aircraft-database"
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  Search,
  Plane,
  Database,
  Layers,
  Box,
} from "lucide-react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ScenePanel({
  parts,
  selectedIds,
  onSelectPart,
  onLoadAircraft,
  onAddPart,
  hiddenParts,
  onToggleVisibility,
}: {
  parts: (AircraftPart & { uid: string })[]
  selectedIds: string[]
  onSelectPart: (uid: string, multi: boolean) => void
  onLoadAircraft: (aircraft: Aircraft) => void
  onAddPart: (type: string) => void
  hiddenParts: Set<string>
  onToggleVisibility: (uid: string) => void
}) {
  const [search, setSearch] = useState("")
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set())

  const toggleCountry = (country: string) => {
    setOpenCountries((prev) => {
      const next = new Set(prev)
      if (next.has(country)) next.delete(country)
      else next.add(country)
      return next
    })
  }

  const filteredParts = parts.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  )

  const groupedParts = filteredParts.reduce(
    (acc, p) => {
      if (!acc[p.type]) acc[p.type] = []
      acc[p.type].push(p)
      return acc
    },
    {} as Record<string, (AircraftPart & { uid: string })[]>
  )

  return (
    <Tabs defaultValue="scene" className="h-full flex flex-col">
      <TabsList className="w-full rounded-none border-b border-border bg-muted/30 h-9">
        <TabsTrigger value="scene" className="flex-1 text-xs gap-1.5 data-[state=active]:bg-background">
          <Layers className="w-3 h-3" /> Cena
        </TabsTrigger>
        <TabsTrigger value="database" className="flex-1 text-xs gap-1.5 data-[state=active]:bg-background">
          <Database className="w-3 h-3" /> Aeronaves
        </TabsTrigger>
        <TabsTrigger value="add" className="flex-1 text-xs gap-1.5 data-[state=active]:bg-background">
          <Plus className="w-3 h-3" /> Adicionar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="scene" className="flex-1 m-0 overflow-hidden">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar partes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
        <ScrollArea className="flex-1 h-[calc(100%-44px)]">
          <div className="p-1">
            {parts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Box className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Nenhuma parte na cena</p>
                <p className="text-xs mt-1">Carregue uma aeronave ou adicione partes</p>
              </div>
            ) : (
              Object.entries(groupedParts).map(([type, typeParts]) => (
                <Collapsible key={type} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-muted/50 rounded text-xs">
                    <div
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: PART_TYPE_COLORS[type] || "#6B7280" }}
                    />
                    <span className="font-medium text-foreground capitalize">
                      {PART_TYPE_LABELS[type] || type.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground ml-auto">{typeParts.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {typeParts.map((part) => (
                      <div
                        key={part.uid}
                        className={`flex items-center gap-2 px-4 py-1 rounded cursor-pointer text-xs group ${
                          selectedIds.includes(part.uid)
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                        onClick={(e) => onSelectPart(part.uid, e.ctrlKey || e.metaKey)}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: part.color }}
                        />
                        <span className="truncate flex-1">{part.label}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleVisibility(part.uid)
                          }}
                        >
                          {hiddenParts.has(part.uid) ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="database" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-1">
            {AIRCRAFT_DATABASE.map((countryData) => (
              <Collapsible
                key={countryData.country}
                open={openCountries.has(countryData.country)}
                onOpenChange={() => toggleCountry(countryData.country)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-2 hover:bg-muted/50 rounded text-xs font-medium text-foreground">
                  {openCountries.has(countryData.country) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>{countryData.flag}</span>
                  <span>{countryData.country}</span>
                  <span className="text-muted-foreground ml-auto">
                    {countryData.aircraft.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {countryData.aircraft.map((ac) => (
                    <button
                      key={ac.id}
                      className="flex items-center gap-2 w-full px-6 py-1.5 hover:bg-muted/50 rounded text-xs text-left text-foreground"
                      onClick={() => onLoadAircraft(ac)}
                    >
                      <Plane className="w-3 h-3 text-muted-foreground" />
                      <span className="flex-1 truncate">{ac.name}</span>
                      <span className="text-muted-foreground">{ac.year}</span>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="add" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {PART_TYPES.map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="justify-start text-xs h-8 gap-2"
                onClick={() => onAddPart(type)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: PART_TYPE_COLORS[type] || "#6B7280" }}
                />
                <span className="truncate capitalize">{PART_TYPE_LABELS[type] || type.replace(/_/g, " ")}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
