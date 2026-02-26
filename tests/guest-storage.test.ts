import { describe, it, expect, beforeEach } from "vitest"
import { getGuestFlygold, setGuestFlygold, getGuestPoints, setGuestPoints, exchangePointsForFlygold, clearGuestData } from "../lib/guest-storage"

describe("Guest Storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores and retrieves guest flygold", () => {
    expect(getGuestFlygold()).toBe(0)
    setGuestFlygold(10)
    expect(getGuestFlygold()).toBe(10)
  })

  it("stores and retrieves guest points", () => {
    expect(getGuestPoints()).toBe(0)
    setGuestPoints(25000)
    expect(getGuestPoints()).toBe(25000)
  })

  it("exchanges points for flygold for unauthenticated users", () => {
    setGuestPoints(25000)
    const res = exchangePointsForFlygold(25000, 10000)
    expect(res.success).toBe(true)
    expect(res.flygoldGained).toBe(2)
    expect(getGuestPoints()).toBe(5000)
    expect(getGuestFlygold()).toBe(2)
  })

  it("does not exchange when insufficient points", () => {
    setGuestPoints(9000)
    const res = exchangePointsForFlygold(9000, 10000)
    expect(res.success).toBe(false)
    expect(getGuestFlygold()).toBe(0)
    expect(getGuestPoints()).toBe(9000)
  })

  it("clears guest data on logout", () => {
    setGuestFlygold(5)
    setGuestPoints(20000)
    localStorage.setItem("guest_upgrades_pending", JSON.stringify({}))
    localStorage.setItem("selected_aircraft_id", "123")
    clearGuestData()
    expect(getGuestFlygold()).toBe(0)
    expect(getGuestPoints()).toBe(0)
    expect(localStorage.getItem("guest_upgrades_pending")).toBeNull()
    expect(localStorage.getItem("selected_aircraft_id")).toBeNull()
  })
})
