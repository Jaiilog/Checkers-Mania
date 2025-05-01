"use client"

import { useState, useEffect } from "react"
import { Volume2, VolumeX } from "lucide-react"
import soundManager from "@/lib/sound-manager"

export default function SoundToggle() {
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    // Preload sounds when component mounts
    setMuted(soundManager.isMuted())

    return () => {
      // No need to call cleanup here as the soundManager is a singleton
      // and should persist throughout the app's lifecycle
    }
  }, [])

  const toggleSound = () => {
    const newMutedState = soundManager.toggleMute()
    setMuted(newMutedState)
  }

  return (
    <button
      onClick={toggleSound}
      className="p-2 rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
    >
      {muted ? <VolumeX className="h-5 w-5 text-gray-700" /> : <Volume2 className="h-5 w-5 text-purple-700" />}
    </button>
  )
}
