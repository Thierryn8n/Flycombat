export function getGuestFlygold(): number {
  try {
    const raw = localStorage.getItem("guest_flygold")
    return raw ? Number(raw) || 0 : 0
  } catch {
    return 0
  }
}

export function setGuestFlygold(value: number) {
  try {
    localStorage.setItem("guest_flygold", String(Math.max(0, Math.floor(value))))
  } catch {}
}

export function getGuestPoints(): number {
  try {
    const raw = localStorage.getItem("guest_points")
    return raw ? Number(raw) || 0 : 0
  } catch {
    return 0
  }
}

export function setGuestPoints(value: number) {
  try {
    localStorage.setItem("guest_points", String(Math.max(0, Math.floor(value))))
  } catch {}
}

export function exchangePointsForFlygold(pointsToUse: number, ratePointsPerFG = 10000) {
  const available = getGuestPoints()
  const use = Math.min(available, Math.max(0, Math.floor(pointsToUse)))
  const fg = Math.floor(use / ratePointsPerFG)
  const leftover = use % ratePointsPerFG
  if (fg <= 0) return { success: false, flygoldGained: 0, pointsSpent: 0 }
  setGuestPoints(available - (fg * ratePointsPerFG))
  setGuestFlygold(getGuestFlygold() + fg)
  return { success: true, flygoldGained: fg, pointsSpent: fg * ratePointsPerFG, leftover }
}

export function clearGuestData() {
  try {
    const keys = [
      "guest_flygold",
      "guest_points",
      "guest_upgrades_pending",
      "guest_colors",
      "selected_aircraft_id",
      "selected_aircraft_parts",
      "selected_aircraft_color",
      "selected_aircraft_upgrades",
      "selected_aircraft_stats",
    ]
    for (const k of keys) localStorage.removeItem(k)
  } catch {}
}
