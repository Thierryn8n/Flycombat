export type UpgradeType = "speed" | "weapons" | "resistance" | "autoaim"

export const UPGRADE_CONFIG = {
  speed: { cost: 100, increment: 0.10 },
  weapons: { cost: 150, increment: 0.15 },
  resistance: { cost: 120, increment: 0.10 },
  autoaim: { cost: 200, increment: 0.05, base: 0.20 },
}
