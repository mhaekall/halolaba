let audioContext: AudioContext | null = null

const getAudioContext = () => {
  if (!audioContext && typeof window !== "undefined") {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Enhanced haptic feedback
export const triggerHapticFeedback = (type: "light" | "medium" | "heavy" = "light") => {
  if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    }
    navigator.vibrate(patterns[type])
  }
}

export const playClickSound = (intensity: "light" | "medium" | "heavy" = "light") => {
  if (typeof window === "undefined") return

  // Trigger haptic feedback
  triggerHapticFeedback(intensity)

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    // Resume context if suspended (required for mobile)
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const filterNode = ctx.createBiquadFilter()

    oscillator.connect(filterNode)
    filterNode.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Enhanced sound based on intensity
    const frequencies = {
      light: { start: 800, end: 600 },
      medium: { start: 1000, end: 700 },
      heavy: { start: 1200, end: 800 },
    }

    const freq = frequencies[intensity]

    // More sophisticated sound wave
    oscillator.type = "triangle"
    oscillator.frequency.setValueAtTime(freq.start, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(freq.end, ctx.currentTime + 0.1)

    // Add filter for richer sound
    filterNode.type = "lowpass"
    filterNode.frequency.setValueAtTime(2000, ctx.currentTime)
    filterNode.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1)

    // Enhanced envelope
    const volume = intensity === "heavy" ? 0.3 : intensity === "medium" ? 0.25 : 0.2
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch (error) {
    // Silent fallback
  }
}

export const playSuccessSound = () => {
  if (typeof window === "undefined") return

  // Success haptic pattern
  triggerHapticFeedback("medium")

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === "suspended") {
      ctx.resume()
    }

    // Success chord with richer harmonics
    const frequencies = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filterNode = ctx.createBiquadFilter()

      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1)

      // Add subtle filter sweep
      filterNode.type = "lowpass"
      filterNode.frequency.setValueAtTime(3000, ctx.currentTime + index * 0.1)
      filterNode.frequency.linearRampToValueAtTime(1500, ctx.currentTime + index * 0.1 + 0.3)

      gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.1)
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + index * 0.1 + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.1 + 0.3)

      oscillator.start(ctx.currentTime + index * 0.1)
      oscillator.stop(ctx.currentTime + index * 0.1 + 0.3)
    })
  } catch (error) {
    // Silent fallback
  }
}

// Add to cart sound
export const playAddToCartSound = () => {
  if (typeof window === "undefined") return

  triggerHapticFeedback("light")

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === "suspended") {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Pleasant "pop" sound
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(600, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05)

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.05)
  } catch (error) {
    // Silent fallback
  }
}

// Initialize audio context on first user interaction
export const initAudio = () => {
  if (typeof window !== "undefined") {
    const ctx = getAudioContext()
    if (ctx && ctx.state === "suspended") {
      ctx.resume()
    }
  }
}
