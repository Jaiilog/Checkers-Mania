// Types for saved game data
export type SavedTournamentData = {
  currentRound: number
  tournamentHistory: any[]
  opponentName: string
  difficulty: string
  lastUpdated: number
}

export type SavedGameData = {
  board: any[][]
  pieces: any[]
  currentTurn: "player" | "computer"
  lastUpdated: number
}

// Keys for localStorage
const TOURNAMENT_DATA_KEY = "checkers_tournament_data"
const GAME_DATA_KEY = "checkers_game_data"

// Save tournament data to localStorage
export function saveTournamentData(data: SavedTournamentData): void {
  try {
    const dataWithTimestamp = {
      ...data,
      lastUpdated: Date.now(),
    }
    localStorage.setItem(TOURNAMENT_DATA_KEY, JSON.stringify(dataWithTimestamp))
  } catch (error) {
    console.error("Error saving tournament data:", error)
  }
}

// Load tournament data from localStorage
export function loadTournamentData(): SavedTournamentData | null {
  try {
    const savedData = localStorage.getItem(TOURNAMENT_DATA_KEY)
    if (!savedData) return null
    return JSON.parse(savedData)
  } catch (error) {
    console.error("Error loading tournament data:", error)
    return null
  }
}

// Save game board data to localStorage
export function saveGameData(data: SavedGameData): void {
  try {
    const dataWithTimestamp = {
      ...data,
      lastUpdated: Date.now(),
    }
    localStorage.setItem(GAME_DATA_KEY, JSON.stringify(dataWithTimestamp))
  } catch (error) {
    console.error("Error saving game data:", error)
  }
}

// Load game board data from localStorage
export function loadGameData(): SavedGameData | null {
  try {
    const savedData = localStorage.getItem(GAME_DATA_KEY)
    if (!savedData) return null
    return JSON.parse(savedData)
  } catch (error) {
    console.error("Error loading game data:", error)
    return null
  }
}

// Clear all saved game data
export function clearSavedGameData(): void {
  try {
    localStorage.removeItem(TOURNAMENT_DATA_KEY)
    localStorage.removeItem(GAME_DATA_KEY)
  } catch (error) {
    console.error("Error clearing saved game data:", error)
  }
}

// Check if there's a saved game
export function hasSavedGame(): boolean {
  try {
    const tournamentData = localStorage.getItem(TOURNAMENT_DATA_KEY)
    const gameData = localStorage.getItem(GAME_DATA_KEY)
    return !!tournamentData && !!gameData
  } catch (error) {
    console.error("Error checking for saved game:", error)
    return false
  }
}

// Get time since last save in a human-readable format
export function getTimeSinceLastSave(): string {
  try {
    const tournamentData = loadTournamentData()
    if (!tournamentData) return ""

    const lastUpdated = tournamentData.lastUpdated
    const now = Date.now()
    const diffMs = now - lastUpdated

    // Convert to minutes
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) {
      return "just now"
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
    } else {
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
      } else {
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
      }
    }
  } catch (error) {
    console.error("Error getting time since last save:", error)
    return ""
  }
}
