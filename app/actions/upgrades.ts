"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type UpgradeType = "speed" | "weapons" | "resistance" | "autoaim"

// Costs and Increments configuration
export const UPGRADE_CONFIG = {
  speed: { cost: 100, increment: 0.10 }, // +10% Speed
  weapons: { cost: 150, increment: 0.15 }, // +15% Damage
  resistance: { cost: 120, increment: 0.10 }, // +10% Health
  autoaim: { cost: 200, increment: 0.05, base: 0.20 }, // Base 20%, +5% per level
}

export async function purchaseUpgrade(aircraftId: string, upgradeType: UpgradeType) {
  const supabase = await createClient()
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // 2. Get User Balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("flygold_balance")
    .eq("id", user.id)
    .single()

  if (!profile) return { success: false, error: "Profile not found" }

  const cost = UPGRADE_CONFIG[upgradeType].cost
  if (profile.flygold_balance < cost) {
    return { success: false, error: "Insufficient funds" }
  }

  // 3. Get Player Aircraft (Lock row?)
  const { data: playerAircraft } = await supabase
    .from("player_aircraft")
    .select("id, custom_full_json, aircraft_id")
    .eq("aircraft_id", aircraftId)
    .eq("player_id", user.id)
    .single()

  if (!playerAircraft) return { success: false, error: "Aircraft not owned" }

  // 4. Calculate New Stats
  let customJson = playerAircraft.custom_full_json || {}
  
  // If customJson is empty, we need to populate it from the base aircraft to ensure we have a baseline
  if (!customJson.parts) {
      const { data: baseAircraft } = await supabase
        .from("aircraft")
        .select("full_code_json, parts_json, base_speed, base_health, base_damage, base_armor")
        .eq("id", playerAircraft.aircraft_id)
        .single()
        
      if (baseAircraft) {
          // Prefer full_code_json if available, else construct from columns
          if (baseAircraft.full_code_json && Object.keys(baseAircraft.full_code_json).length > 0) {
              customJson = JSON.parse(JSON.stringify(baseAircraft.full_code_json)) // Deep copy
          } else {
              customJson = {
                  parts: baseAircraft.parts_json,
                  specs: {
                      maxSpeed: baseAircraft.base_speed,
                      durability: baseAircraft.base_health,
                      firepower: baseAircraft.base_damage,
                      armor: baseAircraft.base_armor
                  }
              }
          }
      }
  }

  // Initialize upgrades tracker if missing
  if (!customJson.upgrades) {
    customJson.upgrades = { speed: 0, weapons: 0, resistance: 0, autoaim: 0 }
  }
  
  // Initialize specs if missing (shouldn't happen with above logic but safe guard)
  if (!customJson.specs) customJson.specs = {}

  // Apply Upgrade Logic
  const currentLevel = customJson.upgrades[upgradeType] || 0
  const newLevel = currentLevel + 1
  customJson.upgrades[upgradeType] = newLevel

  if (upgradeType === "speed") {
     const base = customJson.specs.maxSpeed || 100
     // Increase by percentage of CURRENT or BASE? Usually compound or additive on base.
     // Simple: multiply current by (1 + increment)
     customJson.specs.maxSpeed = Math.round(base * (1 + UPGRADE_CONFIG.speed.increment))
  }
  
  if (upgradeType === "weapons") {
     const base = customJson.specs.firepower || 10
     customJson.specs.firepower = Math.round(base * (1 + UPGRADE_CONFIG.weapons.increment))
  }
  
  if (upgradeType === "resistance") {
     const base = customJson.specs.durability || 100
     customJson.specs.durability = Math.round(base * (1 + UPGRADE_CONFIG.resistance.increment))
  }
  
  if (upgradeType === "autoaim") {
     // Level 1 = 10%, Level 2 = 15%, etc.
     // Formula: Base (0.10) + (Level - 1) * Increment (0.05)
     const chance = UPGRADE_CONFIG.autoaim.base + ((newLevel - 1) * UPGRADE_CONFIG.autoaim.increment)
     customJson.specs.autoAimChance = Math.min(chance, 1.0) // Cap at 100%
  }

  // 5. Execute Transaction (Manual Two-Phase Commit simulation)
  // Deduct Balance
  const { error: balanceError } = await supabase
    .from("profiles")
    .update({ flygold_balance: profile.flygold_balance - cost })
    .eq("id", user.id)

  if (balanceError) return { success: false, error: "Transaction failed" }

  // Update Aircraft with BOTH JSON and Explicit Columns
  const updateData: any = { 
      custom_full_json: customJson,
      // Update the specific column based on upgrade type
      [`upgrade_${upgradeType}_level`]: newLevel 
  }

  const { error: updateError } = await supabase
    .from("player_aircraft")
    .update(updateData)
    .eq("aircraft_id", aircraftId)
    .eq("player_id", user.id)

  if (updateError) {
    // Rollback balance
    // Assuming rpc exists, else fail
    const { error: rollbackError } = await supabase.rpc('increment_balance', { p_user_id: user.id, p_amount: cost })
    if (rollbackError) {
       console.error("CRITICAL: Rollback failed", rollbackError)
       // Should log to a critical errors table or alert system
    }
    return { success: false, error: "Update failed" }
  }

  // 6. Audit Log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "purchase_upgrade",
    entity_type: "player_aircraft",
    entity_id: playerAircraft.id,
    details: {
      aircraft_id: aircraftId,
      upgrade_type: upgradeType,
      cost: cost,
      new_level: newLevel,
      new_balance: profile.flygold_balance - cost
    }
  })

  revalidatePath("/hangar")
  return { success: true, newBalance: profile.flygold_balance - cost, data: customJson }
}

export async function saveAircraftColor(aircraftId: string, color: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("player_aircraft")
    .update({ custom_primary_color: color })
    .eq("aircraft_id", aircraftId)
    .eq("player_id", user.id)

  if (error) return { success: false, error: "Failed to save color" }
  
  revalidatePath("/hangar")
  return { success: true }
}

export async function saveAircraftColorsByType(aircraftId: string, colors: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("player_aircraft")
    .update({ custom_colors_json: colors as any })
    .eq("aircraft_id", aircraftId)
    .eq("player_id", user.id)

  if (error) return { success: false, error: "Failed to save colors" }
  revalidatePath("/hangar")
  return { success: true }
}
