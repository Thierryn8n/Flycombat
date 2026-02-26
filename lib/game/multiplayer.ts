export type MultiplayerState = {
  userId: string
  displayName: string
  position: [number, number, number]
  rotation: [number, number, number]
  hp: number
  maxHp: number
  alive: boolean
  aircraftColor: string
  aircraftName?: string
  avatarUrl?: string
  avatarIcon?: string
  aircraftImage?: string
  points: number
  bonuses: Array<{ type: string; expiresAt: number; remainingMs?: number }>
}

export type MultiplayerBullet = {
  id: string
  position: [number, number, number]
  direction: [number, number, number]
  ownerId: string
}

export type MultiplayerKill = {
  killerId: string
  killerName: string
  victimId: string
  victimName: string
}

export type MultiplayerCallbacks = {
  onPlayerJoin?: (p: MultiplayerState) => void
  onPlayerLeave?: (userId: string) => void
  onPlayerUpdate?: (p: MultiplayerState) => void
  onPlayerShoot?: (b: MultiplayerBullet) => void
  onPlayerKill?: (k: MultiplayerKill) => void
}

export class MultiplayerManager {
  private interval: any = null
  private getState: (() => MultiplayerState) | null = null

  constructor(
    private userId: string,
    private displayName: string,
    private matchId: string,
    private callbacks: MultiplayerCallbacks = {}
  ) {}

  async join(): Promise<void> {
    if (this.callbacks.onPlayerJoin && this.getState) {
      try {
        this.callbacks.onPlayerJoin(this.getState())
      } catch {}
    }
  }

  startBroadcasting(getState: () => MultiplayerState): void {
    this.getState = getState
    if (this.interval) clearInterval(this.interval)
    this.interval = setInterval(() => {
      if (!this.getState) return
      const state = this.getState()
      if (this.callbacks.onPlayerUpdate) {
        try {
          this.callbacks.onPlayerUpdate(state)
        } catch {}
      }
    }, 500)
  }

  leave(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    if (this.callbacks.onPlayerLeave) {
      try {
        this.callbacks.onPlayerLeave(this.userId)
      } catch {}
    }
  }
}
