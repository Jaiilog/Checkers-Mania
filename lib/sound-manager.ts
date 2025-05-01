// Sound manager using Web Audio API for better performance
class SoundManager {
  private audioContext: AudioContext | null = null
  private muted = false

  constructor() {
    // Initialize audio context lazily on first use
    this.initAudioContext()
  }

  private initAudioContext() {
    try {
      // Only create AudioContext when needed and if it doesn't exist
      if (!this.audioContext && typeof window !== "undefined") {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
    } catch (error) {
      console.log("Web Audio API not supported")
    }
  }

  playSound(type: "move" | "jump" | "king" | "win" | "lose" | "start") {
    if (this.muted || !this.audioContext) return

    try {
      // Create oscillator
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Set sound parameters based on type
      switch (type) {
        case "move":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime) // A4
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)
          oscillator.start()
          oscillator.stop(this.audioContext.currentTime + 0.2)
          break
        case "jump":
          oscillator.type = "triangle"
          oscillator.frequency.setValueAtTime(330, this.audioContext.currentTime) // E4
          oscillator.frequency.exponentialRampToValueAtTime(660, this.audioContext.currentTime + 0.1)
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)
          oscillator.start()
          oscillator.stop(this.audioContext.currentTime + 0.3)
          break
        case "king":
          oscillator.type = "square"
          oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime) // C5
          oscillator.frequency.exponentialRampToValueAtTime(783.99, this.audioContext.currentTime + 0.2) // G5
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4)
          oscillator.start()
          oscillator.stop(this.audioContext.currentTime + 0.4)
          break
        case "win":
          this.playSequence([
            { note: 523.25, duration: 0.1 }, // C5
            { note: 659.25, duration: 0.1 }, // E5
            { note: 783.99, duration: 0.3 }, // G5
          ])
          break
        case "lose":
          this.playSequence([
            { note: 493.88, duration: 0.1 }, // B4
            { note: 440, duration: 0.1 }, // A4
            { note: 392, duration: 0.3 }, // G4
          ])
          break
        case "start":
          this.playSequence([
            { note: 392, duration: 0.1 }, // G4
            { note: 493.88, duration: 0.1 }, // B4
            { note: 587.33, duration: 0.1 }, // D5
          ])
          break
      }
    } catch (error) {
      console.log("Error playing sound:", error)
    }
  }

  private playSequence(notes: { note: number; duration: number }[]) {
    if (!this.audioContext) return

    notes.forEach((note, index) => {
      setTimeout(() => {
        if (this.muted || !this.audioContext) return

        const oscillator = this.audioContext.createOscillator()
        const gainNode = this.audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext.destination)

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(note.note, this.audioContext.currentTime)

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration)

        oscillator.start()
        oscillator.stop(this.audioContext.currentTime + note.duration)
      }, index * 150)
    })
  }

  toggleMute() {
    this.muted = !this.muted
    return this.muted
  }

  isMuted() {
    return this.muted
  }

  // Clean up resources
  cleanup() {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch((err) => console.log("Error closing AudioContext:", err))
    }
    this.audioContext = null
  }
}

// Create a singleton instance
const soundManager = new SoundManager()
export default soundManager
