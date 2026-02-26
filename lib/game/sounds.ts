let ctx: AudioContext | null = null
let master: GainNode | null = null
let engineOsc: OscillatorNode | null = null
let engineGain: GainNode | null = null
let engineOscLow: OscillatorNode | null = null
let engineGainLow: GainNode | null = null

function getCtx() {
  if (typeof window === "undefined") return null
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      master = ctx.createGain()
      master.gain.value = 0.2
      master.connect(ctx.destination)
    } catch {
      ctx = null
      master = null
    }
  }
  return ctx
}

function playBeep(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.2) {
  const a = getCtx()
  if (!a || !master) return
  try {
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, a.currentTime)
    g.gain.setValueAtTime(0, a.currentTime)
    g.gain.linearRampToValueAtTime(gain, a.currentTime + 0.01)
    g.gain.linearRampToValueAtTime(0, a.currentTime + durationMs / 1000)
    osc.connect(g)
    g.connect(master)
    osc.start()
    osc.stop(a.currentTime + durationMs / 1000 + 0.02)
  } catch {}
}

export function playShootSound() {
  playBeep(1100, 80, "square", 0.15)
  playBeep(1500, 50, "square", 0.08)
}

export function playBonusSound() {
  playBeep(800, 140, "triangle", 0.2)
}

export function playImpactSound() {
  playBeep(180, 180, "sawtooth", 0.24)
}

export function playCrashSound() {
  playBeep(110, 320, "sawtooth", 0.3)
}

export function playExplosionSound() {
  playBeep(80, 260, "sawtooth", 0.34)
  playBeep(140, 180, "triangle", 0.18)
}

export function startEngineAmbient() {
  const a = getCtx()
  if (!a || !master) return
  if (engineOsc) return
  try {
    engineOsc = a.createOscillator()
    engineGain = a.createGain()
    engineOsc.type = "sawtooth"
    engineOsc.frequency.value = 220
    engineGain.gain.value = 0.06
    engineOscLow = a.createOscillator()
    engineGainLow = a.createGain()
    engineOscLow.type = "triangle"
    engineOscLow.frequency.value = 110
    engineGainLow.gain.value = 0.05
    engineOsc.connect(engineGain)
    engineGain.connect(master)
    engineOscLow.connect(engineGainLow)
    engineGainLow.connect(master)
    engineOsc.start()
    engineOscLow.start()
  } catch {
    engineOsc = null
    engineGain = null
    engineOscLow = null
    engineGainLow = null
  }
}

export function stopEngineAmbient() {
  if (engineOsc) {
    try {
      engineOsc.stop()
    } catch {}
  }
  if (engineOscLow) {
    try {
      engineOscLow.stop()
    } catch {}
  }
  engineOsc = null
  engineGain = null
  engineOscLow = null
  engineGainLow = null
}

export function setEnginePitch(throttle: number) {
  if (!engineOsc) return
  const min = 180
  const max = 420
  const freq = min + (max - min) * Math.max(0, Math.min(1, throttle))
  try {
    engineOsc.frequency.setTargetAtTime(freq, (ctx as AudioContext).currentTime, 0.05)
  } catch {
    engineOsc.frequency.value = freq
  }
  if (engineOscLow) {
    const lowFreq = min * 0.5 + (max * 0.7 - min * 0.5) * Math.max(0, Math.min(1, throttle))
    try {
      engineOscLow.frequency.setTargetAtTime(lowFreq, (ctx as AudioContext).currentTime, 0.06)
    } catch {
      engineOscLow.frequency.value = lowFreq
    }
  }
  if (engineGain && engineGainLow) {
    const g = 0.05 + 0.06 * Math.max(0, Math.min(1, throttle))
    engineGain.gain.setTargetAtTime(g, (ctx as AudioContext).currentTime, 0.08)
    engineGainLow.gain.setTargetAtTime(g * 0.8, (ctx as AudioContext).currentTime, 0.08)
  }
}
