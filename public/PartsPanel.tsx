import { ChevronDown, ChevronRight, Plane, Plus, Search } from "lucide-react";
import { useState } from "react";
import { aircraftDatabase, PART_TYPES, type Aircraft, type AircraftPart } from "@/data/aircraftDatabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface PartsPanelProps {
  parts: (AircraftPart & { uid: string })[];
  selectedIds: string[];
  onSelectPart: (uid: string, multi: boolean) => void;
  onLoadAircraft: (aircraft: Aircraft) => void;
  onAddPart: (type: string) => void;
  activeTab: "aircraft" | "parts" | "add";
  setActiveTab: (tab: "aircraft" | "parts" | "add") => void;
}

export default function PartsPanel({
  parts, selectedIds, onSelectPart, onLoadAircraft, onAddPart,
  activeTab, setActiveTab,
}: PartsPanelProps) {
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredParts = search
    ? parts.filter(p => p.label.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase()))
    : parts;

  return (
    <div className="w-64 flex flex-col border-r border-border bg-card h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
          <Plane className="w-4 h-4 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-xs font-semibold text-foreground">Aircraft CAD</h1>
          <p className="text-[10px] text-muted-foreground">{parts.length} componentes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([["aircraft", "✈ Aeronaves"], ["parts", "📦 Partes"], ["add", "＋ Adicionar"]] as const).map(([id, lbl]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
              activeTab === id
                ? "text-accent border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {activeTab === "aircraft" && (
            <div className="space-y-1">
              {aircraftDatabase.map(cat => (
                <div key={cat.country}>
                  <button
                    onClick={() => setOpenCountry(openCountry === cat.country ? null : cat.country)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-secondary transition-colors"
                  >
                    <span>{cat.flag} {cat.country}</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-[10px]">{cat.aircraft.length}</span>
                      {openCountry === cat.country ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                  </button>
                  {openCountry === cat.country && (
                    <div className="pl-2 space-y-0.5 mt-0.5">
                      {cat.aircraft.map(ac => (
                        <button
                          key={ac.id}
                          onClick={() => onLoadAircraft(ac)}
                          className="w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-cad-hover transition-colors group"
                        >
                          <div className="font-medium text-foreground group-hover:text-accent">{ac.name}</div>
                          <div className="text-[9px] text-muted-foreground">{ac.year} · {ac.parts.length} partes</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "parts" && (
            <div className="space-y-1">
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar parte..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-7 text-[11px]"
                />
              </div>
              {filteredParts.map(p => (
                <button
                  key={p.uid}
                  onClick={() => onSelectPart(p.uid, false)}
                  className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 transition-colors ${
                    selectedIds.includes(p.uid)
                      ? "bg-accent/10 text-accent border border-accent/30"
                      : "hover:bg-secondary"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.label}</div>
                    <div className="text-[9px] text-muted-foreground">{p.type}</div>
                  </div>
                </button>
              ))}
              {filteredParts.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">Nenhuma parte encontrada</p>
              )}
            </div>
          )}

          {activeTab === "add" && (
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(PART_TYPES).map(([type, color]) => (
                <button
                  key={type}
                  onClick={() => onAddPart(type)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[9px] uppercase font-medium hover:bg-secondary transition-colors border border-border"
                >
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate">{type.replace(/_/g, " ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
