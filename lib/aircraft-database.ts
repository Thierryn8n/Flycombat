export interface AircraftPart {
  id: string
  uid?: string
  label: string
  type: string
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  color: string
  opacity?: number
  rotationX?: number
  rotationY?: number
  rotationZ?: number
  shape?: string
  sweepDeg?: number
  taper?: number
  tipAxis?: string
  tipTaper?: number
  tipRound?: number
}

export interface AircraftSpec {
  length: number
  wingspan: number
  height: number
  emptyWeight: number
  maxSpeed: number
  range: number
  ceiling: number
  thrust: number
  crew: number
}

export interface Aircraft {
  id: string
  name: string
  year: number
  manufacturer?: string
  country?: string
  type?: string
  specs?: AircraftSpec
  parts: AircraftPart[]
}

export interface AircraftCountry {
  country: string
  flag: string
  aircraft: Aircraft[]
}

export const PART_TYPES = [
  "fuselage", "wing", "tail_v", "tail_h", "engine", "cockpit", "nose",
  "canard", "intake", "landing_gear", "missile", "pylon", "fuel_tank",
  "weapon_bay", "cannon", "flap", "aileron", "lerx", "afterburner",
  "nozzle", "canopy", "radar", "custom"
] as const

export const PART_TYPE_COLORS: Record<string, string> = {
  fuselage: "#64748B",
  wing: "#22C55E",
  tail_v: "#F59E0B",
  tail_h: "#EAB308",
  engine: "#EF4444",
  cockpit: "#06B6D4",
  nose: "#8B5CF6",
  canard: "#EC4899",
  intake: "#F97316",
  landing_gear: "#6B7280",
  missile: "#DC2626",
  pylon: "#78716C",
  fuel_tank: "#0EA5E9",
  weapon_bay: "#6366F1",
  cannon: "#1F2937",
  flap: "#10B981",
  aileron: "#14B8A6",
  lerx: "#7C3AED",
  afterburner: "#FF4500",
  nozzle: "#374151",
  canopy: "#87CEEB",
  radar: "#334155",
  custom: "#A855F7",
}

export const PART_TYPE_LABELS: Record<string, string> = {
  fuselage: "Fuselagem",
  wing: "Asa",
  tail_v: "Deriva Vertical",
  tail_h: "Estabilizador Horizontal",
  engine: "Motor",
  cockpit: "Cockpit",
  nose: "Nariz",
  canard: "Canard",
  intake: "Entrada de Ar",
  landing_gear: "Trem de Pouso",
  missile: "Míssil",
  pylon: "Pilone",
  fuel_tank: "Tanque de Combustível",
  weapon_bay: "Baía de Armas",
  cannon: "Canhão",
  flap: "Flap",
  aileron: "Aileron",
  lerx: "LERX",
  afterburner: "Pós-Combustor",
  nozzle: "Bocal de Exaustão",
  canopy: "Canopy",
  radar: "Radar",
  custom: "Personalizado",
}

export const ADVANCED_PART_PRESETS: AircraftPart[] = [
  { id: "fuselage_adv", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 20, h: 3.2, d: 2.9, color: "#5A6872", shape: "capsule" },
  { id: "wing_adv", label: "Asa", type: "wing", x: 0, y: 0, z: 0, w: 14, h: 0.45, d: 7.2, color: "#4A5862", shape: "wing_swept", sweepDeg: 25, taper: 0.55 },
  { id: "tail_h_adv", label: "Estabilizador Horizontal", type: "tail_h", x: 0, y: 0, z: 0, w: 6.8, h: 0.42, d: 3.9, color: "#4A5862", shape: "wing_swept", sweepDeg: 20, taper: 0.6 },
  { id: "tail_v_adv", label: "Deriva Vertical", type: "tail_v", x: 0, y: 0, z: 0, w: 4.6, h: 5.4, d: 0.48, color: "#4A5862", shape: "tail_swept", sweepDeg: 25, taper: 0.55 },
  { id: "engine_adv", label: "Motor", type: "engine", x: 0, y: 0, z: 0, w: 8.7, h: 1.92, d: 1.92, color: "#1F252E", shape: "engine" },
  { id: "cockpit_adv", label: "Cockpit", type: "cockpit", x: 0, y: 0, z: 0, w: 3.3, h: 1.65, d: 2.3, color: "#87CEEB", opacity: 0.68, shape: "rounded" },
  { id: "nose_adv", label: "Nariz / Cone Frontal", type: "nose", x: 0, y: 0, z: 0, w: 4.6, h: 2.16, d: 2.16, color: "#3A4852", shape: "nose_cone" },
  { id: "canard_adv", label: "Canard", type: "canard", x: 0, y: 0, z: 0, w: 5.1, h: 0.38, d: 2.9, color: "#4A5862", shape: "wing_swept", sweepDeg: 20, taper: 0.65 },
  { id: "intake_adv", label: "Entrada de Ar", type: "intake", x: 0, y: 0, z: 0, w: 6.7, h: 2.3, d: 1.7, color: "#2A3842", shape: "intake_scoop" },
  { id: "landing_gear_adv", label: "Trem de Pouso", type: "landing_gear", x: 0, y: 0, z: 0, w: 4.1, h: 0.76, d: 0.76, color: "#333333", shape: "cannon" },
  { id: "missile_adv", label: "Míssil", type: "missile", x: 0, y: 0, z: 0, w: 6.7, h: 0.64, d: 0.64, color: "#A8B0B8", shape: "missile" },
  { id: "pylon_adv", label: "Pilone", type: "pylon", x: 0, y: 0, z: 0, w: 2.6, h: 1.25, d: 0.85, color: "#555555", shape: "box" },
  { id: "fuel_tank_adv", label: "Tanque de Combustível", type: "fuel_tank", x: 0, y: 0, z: 0, w: 7.1, h: 1.84, d: 1.84, color: "#6A7A82", shape: "fuel_tank" },
  { id: "weapon_bay_adv", label: "Baía de Armas", type: "weapon_bay", x: 0, y: 0, z: 0, w: 5.7, h: 1.65, d: 4.7, color: "#2A3842", shape: "box" },
  { id: "cannon_adv", label: "Canhão", type: "cannon", x: 0, y: 0, z: 0, w: 5.2, h: 0.52, d: 0.52, color: "#222222", shape: "cannon" },
  { id: "flap_adv", label: "Flap", type: "flap", x: 0, y: 0, z: 0, w: 6.1, h: 0.32, d: 2.5, color: "#4A5862", shape: "wing_swept", sweepDeg: 15, taper: 0.7 },
  { id: "aileron_adv", label: "Aileron", type: "aileron", x: 0, y: 0, z: 0, w: 4.6, h: 0.33, d: 1.85, color: "#4A5862", shape: "wing_swept", sweepDeg: 15, taper: 0.7 },
  { id: "lerx_adv", label: "LERX", type: "lerx", x: 0, y: 0, z: 0, w: 7.1, h: 0.48, d: 3.6, color: "#4A5862", shape: "wing_swept", sweepDeg: 25, taper: 0.6 },
  { id: "afterburner_adv", label: "Pós-Combustor", type: "afterburner", x: 0, y: 0, z: 0, w: 3.6, h: 1.82, d: 1.82, color: "#1F252E", shape: "nozzle" },
  { id: "nozzle_adv", label: "Bocal de Exaustão", type: "nozzle", x: 0, y: 0, z: 0, w: 2.9, h: 2.24, d: 2.24, color: "#333333", shape: "nozzle" },
  { id: "canopy_adv", label: "Canopy", type: "canopy", x: 0, y: 0, z: 0, w: 3.1, h: 1.45, d: 2.15, color: "#87CEEB", opacity: 0.67, shape: "canopy" },
  { id: "radar_adv", label: "Radar / Radome", type: "radar", x: 0, y: 0, z: 0, w: 2.44, h: 2.44, d: 2.44, color: "#1F2A33", shape: "sphere" },
]

export const AIRCRAFT_DATABASE: AircraftCountry[] = [
  {
    country: "EUA",
    flag: "US",
    aircraft: [
      {
        id: "f22",
        name: "F-22 Raptor",
        year: 2005,
        manufacturer: "Lockheed Martin",
        country: "United States",
        type: "Air Superiority Fighter",
        specs: {
          length: 18.92,
          wingspan: 13.56,
          height: 5.08,
          emptyWeight: 19700,
          maxSpeed: 2410,
          range: 2960,
          ceiling: 19800,
          thrust: 35000,
          crew: 1,
        },
        parts: [
          { id: "fus_main", label: "Fuselagem Principal", type: "fuselage", x: 0, y: 0, z: 0, w: 19, h: 2.5, d: 1.8, color: "#5A6872" },
          { id: "fus_nose", label: "Fuselagem Frontal", type: "fuselage", x: 8, y: 0.1, z: -0.1, w: 4, h: 2.2, d: 1.6, color: "#4A5862" },
          { id: "fus_rear", label: "Fuselagem Traseira", type: "fuselage", x: -8, y: 0, z: 0, w: 6, h: 2.6, d: 1.9, color: "#5A6872" },
          { id: "fus_tail", label: "Cone de Cauda", type: "fuselage", x: -13, y: 0, z: 0, w: 4, h: 2.0, d: 1.4, color: "#4A5862" },
          { id: "wing_main_r", label: "Asa Principal Direita", type: "wing", x: -1, y: 0, z: 1.9, w: 12, h: 0.4, d: 5.8, color: "#4A5862" },
          { id: "wing_main_l", label: "Asa Principal Esquerda", type: "wing", x: -1, y: 0, z: -7.7, w: 12, h: 0.4, d: 5.8, color: "#4A5862" },
          { id: "leading_edge_r", label: "Borda Ataque Dir", type: "lerx", x: -1, y: 0.3, z: 2.2, w: 10, h: 0.3, d: 5.2, color: "#3A4852" },
          { id: "leading_edge_l", label: "Borda Ataque Esq", type: "lerx", x: -1, y: 0.3, z: -7.4, w: 10, h: 0.3, d: 5.2, color: "#3A4852" },
          { id: "trailing_flap_r", label: "Flape Dir", type: "flap", x: -4, y: 0.1, z: 2.0, w: 6, h: 0.25, d: 4.5, color: "#4A5862" },
          { id: "trailing_flap_l", label: "Flape Esq", type: "flap", x: -4, y: 0.1, z: -6.5, w: 6, h: 0.25, d: 4.5, color: "#4A5862" },
          { id: "aileron_r", label: "Aileron Dir", type: "aileron", x: -6, y: 0.1, z: 2.0, w: 4, h: 0.2, d: 3.5, color: "#5A6872" },
          { id: "aileron_l", label: "Aileron Esq", type: "aileron", x: -6, y: 0.1, z: -5.5, w: 4, h: 0.2, d: 3.5, color: "#5A6872" },
          { id: "lerx_r", label: "LERX Dir", type: "lerx", x: 4, y: 0.4, z: 1.2, w: 3, h: 0.5, d: 2.5, color: "#3A4852" },
          { id: "lerx_l", label: "LERX Esq", type: "lerx", x: 4, y: 0.4, z: -3.7, w: 3, h: 0.5, d: 2.5, color: "#3A4852" },
          { id: "vert_stab_r", label: "Deriva Vertical Dir", type: "tail_v", x: -7, y: 1.5, z: 1.0, w: 4, h: 4.0, d: 0.4, color: "#4A5862", rotationZ: -25 },
          { id: "vert_stab_l", label: "Deriva Vertical Esq", type: "tail_v", x: -7, y: 1.5, z: -1.4, w: 4, h: 4.0, d: 0.4, color: "#4A5862", rotationZ: 25 },
          { id: "horiz_stab_r", label: "Estab Horizontal Dir", type: "tail_h", x: -7.5, y: 0.5, z: 1.8, w: 5.5, h: 0.35, d: 3.2, color: "#4A5862" },
          { id: "horiz_stab_l", label: "Estab Horizontal Esq", type: "tail_h", x: -7.5, y: 0.5, z: -5.0, w: 5.5, h: 0.35, d: 3.2, color: "#4A5862" },
          { id: "air_intake_r", label: "Entrada Ar Dir", type: "intake", x: 1, y: -0.3, z: 1.4, w: 6, h: 1.8, d: 1.2, color: "#2A3842" },
          { id: "air_intake_l", label: "Entrada Ar Esq", type: "intake", x: 1, y: -0.3, z: -2.6, w: 6, h: 1.8, d: 1.2, color: "#2A3842" },
          { id: "engine_r", label: "Motor F119 Dir", type: "engine", x: -8, y: -0.5, z: 1.0, w: 7, h: 1.5, d: 1.5, color: "#1A1A1A" },
          { id: "engine_l", label: "Motor F119 Esq", type: "engine", x: -8, y: -0.5, z: -2.5, w: 7, h: 1.5, d: 1.5, color: "#1A1A1A" },
          { id: "nozzle_r", label: "Bocal Dir", type: "nozzle", x: -14, y: -0.5, z: 1.0, w: 2, h: 1.4, d: 1.4, color: "#333333" },
          { id: "nozzle_l", label: "Bocal Esq", type: "nozzle", x: -14, y: -0.5, z: -2.4, w: 2, h: 1.4, d: 1.4, color: "#333333" },
          { id: "cockpit_base", label: "Base Cockpit", type: "cockpit", x: 5, y: 0.2, z: -0.9, w: 2.5, h: 1.0, d: 1.6, color: "#2A2A2A" },
          { id: "canopy", label: "Canopy", type: "canopy", x: 5.5, y: 1.0, z: -0.9, w: 2.8, h: 1.2, d: 1.8, color: "#87CEEB", opacity: 0.6 },
          { id: "nose_cone", label: "Cone de Nariz", type: "nose", x: 9, y: -0.1, z: -0.6, w: 3, h: 1.5, d: 1.3, color: "#3A4852" },
          { id: "radar", label: "Radar AN/APG-77", type: "radar", x: 9.5, y: 0.2, z: -0.6, w: 1.5, h: 1, d: 1, color: "#2A2A2A" },
          { id: "lg_nose", label: "Trem Nariz", type: "landing_gear", x: 6, y: -1.5, z: -0.9, w: 2, h: 2.5, d: 1, color: "#333333" },
          { id: "lg_main_r", label: "Trem Principal Dir", type: "landing_gear", x: -2, y: -1.5, z: 2, w: 3, h: 3, d: 1.5, color: "#333333" },
          { id: "lg_main_l", label: "Trem Principal Esq", type: "landing_gear", x: -2, y: -1.5, z: -3.5, w: 3, h: 3, d: 1.5, color: "#333333" },
        ],
      },
      {
        id: "f35",
        name: "F-35 Lightning II",
        year: 2015,
        manufacturer: "Lockheed Martin",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 15, h: 2.6, d: 2.1, color: "#78716C" },
          { id: "wR", label: "Asa Dir", type: "wing", x: -1, y: 0, z: 2.1, w: 8, h: 0.3, d: 4.5, color: "#57534E" },
          { id: "wL", label: "Asa Esq", type: "wing", x: -1, y: 0, z: -6.6, w: 8, h: 0.3, d: 4.5, color: "#57534E" },
          { id: "vt", label: "Deriva", type: "tail_v", x: -5.5, y: 0, z: -0.2, w: 3, h: 3, d: 0.4, color: "#374151" },
          { id: "htR", label: "Estab H Dir", type: "tail_h", x: -6, y: 0, z: 1, w: 4, h: 0.25, d: 3, color: "#374151" },
          { id: "htL", label: "Estab H Esq", type: "tail_h", x: -6, y: 0, z: -4, w: 4, h: 0.25, d: 3, color: "#374151" },
          { id: "eng", label: "Motor F135", type: "engine", x: -5, y: -0.4, z: -1.1, w: 6, h: 1.8, d: 2.2, color: "#0F172A" },
          { id: "ck", label: "Cockpit", type: "cockpit", x: 3, y: 1.0, z: -1.0, w: 2.5, h: 1.1, d: 2, color: "#BFDBFE" },
          { id: "int", label: "Entrada Ar", type: "intake", x: -0.5, y: -1.0, z: -1.2, w: 3.5, h: 0.9, d: 2.4, color: "#374151" },
          { id: "nose", label: "Nariz EOTS", type: "nose", x: 5.5, y: -0.2, z: -0.7, w: 2.5, h: 1.4, d: 1.4, color: "#1F2937" },
        ],
      },
      {
        id: "f16",
        name: "F-16 Fighting Falcon",
        year: 1978,
        manufacturer: "General Dynamics",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 14, h: 2, d: 1.8, color: "#9CA3AF" },
          { id: "wR", label: "Asa Dir", type: "wing", x: -1, y: 0, z: 1.8, w: 6, h: 0.25, d: 4.5, color: "#9CA3AF" },
          { id: "wL", label: "Asa Esq", type: "wing", x: -1, y: 0, z: -6.3, w: 6, h: 0.25, d: 4.5, color: "#9CA3AF" },
          { id: "vt", label: "Deriva", type: "tail_v", x: -5, y: 0, z: -0.2, w: 2.5, h: 2.5, d: 0.35, color: "#9CA3AF" },
          { id: "htR", label: "Estab H Dir", type: "tail_h", x: -6, y: 0, z: 0.9, w: 3.5, h: 0.22, d: 2.5, color: "#9CA3AF" },
          { id: "htL", label: "Estab H Esq", type: "tail_h", x: -6, y: 0, z: -3.4, w: 3.5, h: 0.22, d: 2.5, color: "#9CA3AF" },
          { id: "eng", label: "Motor F110", type: "engine", x: -4.5, y: -0.1, z: -0.6, w: 5.5, h: 1.2, d: 1.2, color: "#374151" },
          { id: "ck", label: "Cockpit 360", type: "cockpit", x: 2.5, y: 0.9, z: -0.9, w: 2.2, h: 0.9, d: 1.8, color: "#93C5FD" },
          { id: "int", label: "Entrada Ventral", type: "intake", x: -0.5, y: -0.9, z: -0.9, w: 2, h: 0.7, d: 1.8, color: "#4B5563" },
          { id: "nose", label: "Radome", type: "nose", x: 5.5, y: -0.1, z: -0.6, w: 2.5, h: 1, d: 1.2, color: "#6B7280" },
        ],
      },
      {
        id: "sr71",
        name: "SR-71 Blackbird",
        year: 1966,
        manufacturer: "Lockheed",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 30, h: 1.5, d: 1.6, color: "#111827" },
          { id: "wR", label: "Asa Delta Dir", type: "wing", x: -4, y: 0, z: 1.6, w: 12, h: 0.2, d: 5.5, color: "#0F172A" },
          { id: "wL", label: "Asa Delta Esq", type: "wing", x: -4, y: 0, z: -7.1, w: 12, h: 0.2, d: 5.5, color: "#0F172A" },
          { id: "eR", label: "Motor J58 Dir", type: "engine", x: -5, y: -0.2, z: 2.2, w: 11, h: 1.3, d: 1.3, color: "#1F2937" },
          { id: "eL", label: "Motor J58 Esq", type: "engine", x: -5, y: -0.2, z: -3.5, w: 11, h: 1.3, d: 1.3, color: "#1F2937" },
          { id: "ck", label: "Cockpit Duplo", type: "cockpit", x: 5, y: 0.7, z: -0.8, w: 3.5, h: 0.9, d: 1.6, color: "#93C5FD" },
          { id: "nose", label: "Nariz Titan", type: "nose", x: 13, y: -0.1, z: -0.5, w: 4, h: 0.7, d: 1, color: "#1F2937" },
        ],
      },
      {
        id: "b2",
        name: "B-2 Spirit",
        year: 1997,
        manufacturer: "Northrop Grumman",
        parts: [
          { id: "body", label: "Centro", type: "fuselage", x: 0, y: 0, z: 0, w: 10, h: 1.5, d: 6, color: "#111827" },
          { id: "wR", label: "Asa Dir", type: "wing", x: -3, y: 0, z: 6, w: 14, h: 0.4, d: 12, color: "#0F172A" },
          { id: "wL", label: "Asa Esq", type: "wing", x: -3, y: 0, z: -18, w: 14, h: 0.4, d: 12, color: "#0F172A" },
          { id: "e1", label: "Motor GE #1", type: "engine", x: -0.5, y: -0.3, z: 1.8, w: 3.5, h: 0.8, d: 0.9, color: "#030712" },
          { id: "e2", label: "Motor GE #2", type: "engine", x: -0.5, y: -0.3, z: 3.3, w: 3.5, h: 0.8, d: 0.9, color: "#030712" },
          { id: "ck", label: "Cockpit", type: "cockpit", x: 2.5, y: 0.7, z: -0.8, w: 3, h: 0.7, d: 1.6, color: "#60A5FA" },
        ],
      },
    ],
  },
  {
    country: "Russia",
    flag: "RU",
    aircraft: [
      {
        id: "su57",
        name: "Su-57 Felon",
        year: 2020,
        manufacturer: "Sukhoi",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 18, h: 2.5, d: 2.3, color: "#6B7280" },
          { id: "wR", label: "Asa Dir", type: "wing", x: -2, y: 0, z: 2.3, w: 9, h: 0.3, d: 6, color: "#4B5563" },
          { id: "wL", label: "Asa Esq", type: "wing", x: -2, y: 0, z: -8.3, w: 9, h: 0.3, d: 6, color: "#4B5563" },
          { id: "canR", label: "Canard Dir", type: "canard", x: 5, y: 0.5, z: 2, w: 3.5, h: 0.22, d: 2.5, color: "#6B7280" },
          { id: "canL", label: "Canard Esq", type: "canard", x: 5, y: 0.5, z: -4.5, w: 3.5, h: 0.22, d: 2.5, color: "#6B7280" },
          { id: "vtR", label: "Deriva Dir", type: "tail_v", x: -7, y: 0, z: 1, w: 3.5, h: 3.5, d: 0.4, color: "#374151" },
          { id: "vtL", label: "Deriva Esq", type: "tail_v", x: -7, y: 0, z: -1.4, w: 3.5, h: 3.5, d: 0.4, color: "#374151" },
          { id: "eR", label: "AL-41F1 Dir", type: "engine", x: -7, y: -0.3, z: 1, w: 7.5, h: 1.4, d: 1.3, color: "#0F172A" },
          { id: "eL", label: "AL-41F1 Esq", type: "engine", x: -7, y: -0.3, z: -2.3, w: 7.5, h: 1.4, d: 1.3, color: "#0F172A" },
          { id: "ck", label: "Cockpit", type: "cockpit", x: 4.5, y: 1.1, z: -1.0, w: 2.8, h: 1.1, d: 2, color: "#93C5FD" },
          { id: "nose", label: "Radome N036", type: "nose", x: 8, y: -0.2, z: -0.8, w: 3, h: 1.3, d: 1.5, color: "#374151" },
        ],
      },
      {
        id: "su27",
        name: "Su-27 Flanker",
        year: 1985,
        manufacturer: "Sukhoi",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 21, h: 2.4, d: 2.2, color: "#9CA3AF" },
          { id: "wR", label: "Asa Dir", type: "wing", x: -2, y: 0, z: 2.2, w: 9.5, h: 0.3, d: 7, color: "#6B7280" },
          { id: "wL", label: "Asa Esq", type: "wing", x: -2, y: 0, z: -9.2, w: 9.5, h: 0.3, d: 7, color: "#6B7280" },
          { id: "vtR", label: "Deriva Dir", type: "tail_v", x: -8, y: 0, z: 1, w: 4, h: 4, d: 0.35, color: "#9CA3AF" },
          { id: "vtL", label: "Deriva Esq", type: "tail_v", x: -8, y: 0, z: -1.35, w: 4, h: 4, d: 0.35, color: "#9CA3AF" },
          { id: "eR", label: "AL-31F Dir", type: "engine", x: -7, y: -0.3, z: 1.2, w: 7, h: 1.4, d: 1.4, color: "#111827" },
          { id: "eL", label: "AL-31F Esq", type: "engine", x: -7, y: -0.3, z: -2.6, w: 7, h: 1.4, d: 1.4, color: "#111827" },
          { id: "ck", label: "Cockpit", type: "cockpit", x: 5, y: 1.1, z: -1.1, w: 2.5, h: 1, d: 2.2, color: "#BAE6FD" },
          { id: "nose", label: "Radome N001", type: "nose", x: 8.5, y: -0.2, z: -0.8, w: 3.5, h: 1.2, d: 1.6, color: "#4B5563" },
        ],
      },
    ],
  },
  {
    country: "China",
    flag: "CN",
    aircraft: [
      {
        id: "j20",
        name: "J-20 Mighty Dragon",
        year: 2017,
        manufacturer: "Chengdu",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 20, h: 2.7, d: 2.3, color: "#374151" },
          { id: "wR", label: "Asa Delta Dir", type: "wing", x: -2, y: 0, z: 2.3, w: 9, h: 0.3, d: 6.5, color: "#1F2937" },
          { id: "wL", label: "Asa Delta Esq", type: "wing", x: -2, y: 0, z: -8.8, w: 9, h: 0.3, d: 6.5, color: "#1F2937" },
          { id: "canR", label: "Canard Dir", type: "canard", x: 5.5, y: 0.5, z: 2, w: 4, h: 0.22, d: 3, color: "#374151" },
          { id: "canL", label: "Canard Esq", type: "canard", x: 5.5, y: 0.5, z: -5, w: 4, h: 0.22, d: 3, color: "#374151" },
          { id: "vtR", label: "Deriva Dir", type: "tail_v", x: -7, y: 0, z: 1, w: 3.5, h: 3.5, d: 0.4, color: "#1F2937" },
          { id: "vtL", label: "Deriva Esq", type: "tail_v", x: -7, y: 0, z: -1.4, w: 3.5, h: 3.5, d: 0.4, color: "#1F2937" },
          { id: "eR", label: "Motor WS-15 Dir", type: "engine", x: -7, y: -0.3, z: 1, w: 7.5, h: 1.4, d: 1.3, color: "#030712" },
          { id: "eL", label: "Motor WS-15 Esq", type: "engine", x: -7, y: -0.3, z: -2.3, w: 7.5, h: 1.4, d: 1.3, color: "#030712" },
          { id: "ck", label: "Cockpit", type: "cockpit", x: 5.5, y: 1.2, z: -1.1, w: 2.5, h: 1, d: 2.2, color: "#7DD3FC" },
          { id: "nose", label: "Nariz Furtivo", type: "nose", x: 9, y: -0.2, z: -0.9, w: 4, h: 1.3, d: 1.8, color: "#111827" },
        ],
      },
    ],
  },
  {
    country: "Alemanha",
    flag: "DE",
    aircraft: [
      {
        id: "typhoon",
        name: "Eurofighter Typhoon",
        year: 2003,
        manufacturer: "Airbus/BAE",
        parts: [
          { id: "fus", label: "Fuselagem", type: "fuselage", x: 0, y: 0, z: 0, w: 14, h: 2.2, d: 2, color: "#94A3B8" },
          { id: "wR", label: "Asa Delta Dir", type: "wing", x: -1, y: 0, z: 2, w: 7.5, h: 0.25, d: 5.5, color: "#64748B" },
          { id: "wL", label: "Asa Delta Esq", type: "wing", x: -1, y: 0, z: -7.5, w: 7.5, h: 0.25, d: 5.5, color: "#64748B" },
          { id: "canR", label: "Canard Dir", type: "canard", x: 4.5, y: 0.5, z: 1.8, w: 2.5, h: 0.2, d: 2, color: "#94A3B8" },
          { id: "canL", label: "Canard Esq", type: "canard", x: 4.5, y: 0.5, z: -3.8, w: 2.5, h: 0.2, d: 2, color: "#94A3B8" },
          { id: "vt", label: "Deriva", type: "tail_v", x: -5, y: 0, z: -0.2, w: 3, h: 3, d: 0.3, color: "#94A3B8" },
          { id: "eR", label: "EJ200 Dir", type: "engine", x: -4.5, y: -0.2, z: 0.6, w: 5.5, h: 1.2, d: 1.2, color: "#0F172A" },
          { id: "eL", label: "EJ200 Esq", type: "engine", x: -4.5, y: -0.2, z: -1.8, w: 5.5, h: 1.2, d: 1.2, color: "#0F172A" },
          { id: "ck", label: "Cockpit", type: "cockpit", x: 3.5, y: 1.0, z: -1, w: 2, h: 0.85, d: 2, color: "#BAE6FD" },
          { id: "nose", label: "Radome Captor-E", type: "nose", x: 5.5, y: -0.1, z: -0.7, w: 2.5, h: 1.1, d: 1.4, color: "#374151" },
        ],
      },
    ],
  },
]
