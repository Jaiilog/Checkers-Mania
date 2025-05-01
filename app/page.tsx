"use client"

import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import GameBoard from "@/components/game-board"
import TournamentTracker from "@/components/tournament-tracker"
import SoundToggle from "@/components/sound-toggle"
import { generateComputerName, getRandomDifficulty, resetDifficultyHistory } from "@/lib/game-utils"
import { Trophy, Award, Zap, Save, RotateCcw } from "lucide-react"
import soundManager from "@/lib/sound-manager"
import {
  saveTournamentData,
  loadTournamentData,
  clearSavedGameData,
  hasSavedGame,
  getTimeSinceLastSave,
} from "@/lib/storage-utils"

type GameHistory = {
  round: number
  opponentName: string
  difficulty: string
  result: "win" | "loss"
}

export default function CheckersGame(): ReactElement {
  const [currentRound, setCurrentRound] = useState(1)
  const [gameActive, setGameActive] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [playerWon, setPlayerWon] = useState(false)
  const [opponentName, setOpponentName] = useState("")
  const [difficulty, setDifficulty] = useState("easy")
  const [tournamentHistory, setTournamentHistory] = useState<GameHistory[]>([])
  const [showIntro, setShowIntro] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)
  const [timeSinceLastSave, setTimeSinceLastSave] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Check for saved game on mount
  useEffect(() => {
    const checkForSavedGame = () => {
      const savedGameExists = hasSavedGame()
      setHasSaved(savedGameExists)
      if (savedGameExists) {
        setTimeSinceLastSave(getTimeSinceLastSave())
      }
      setIsLoading(false)
    }

    checkForSavedGame()
  }, [])

  useEffect(() => {
    let isMounted = true

    if (gameActive && isMounted) {
      setOpponentName(generateComputerName())
      setDifficulty(getRandomDifficulty(currentRound))
    }

    return () => {
      isMounted = false
    }
  }, [gameActive, currentRound])

  // Save tournament data whenever it changes
  useEffect(() => {
    if (!showIntro && !isLoading) {
      saveTournamentData({
        currentRound,
        tournamentHistory,
        opponentName,
        difficulty,
        lastUpdated: Date.now(),
      })
    }
  }, [currentRound, tournamentHistory, opponentName, difficulty, showIntro, isLoading])

  // Add a cleanup effect for the sound manager when the component unmounts
  useEffect(() => {
    return () => {
      // Clean up sound manager when the component unmounts
      soundManager.cleanup()
    }
  }, [])

  const startGame = (): void => {
    setShowIntro(false)
    setGameActive(true)
    setGameOver(false)
    setPlayerWon(false)
    setOpponentName(generateComputerName())
    setDifficulty(getRandomDifficulty(currentRound))
    soundManager.playSound("start")
  }

  const continueSavedGame = (): void => {
    const savedData = loadTournamentData()
    if (savedData) {
      setCurrentRound(savedData.currentRound)
      setTournamentHistory(savedData.tournamentHistory)
      setOpponentName(savedData.opponentName)
      setDifficulty(savedData.difficulty)
      setShowIntro(false)
      setGameActive(true)
      setGameOver(false)
      setPlayerWon(false)
      soundManager.playSound("start")
    }
  }

  const handleGameEnd = (playerWins: boolean): void => {
    setGameActive(false)
    setGameOver(true)
    setPlayerWon(playerWins)

    // Play appropriate sound
    soundManager.playSound(playerWins ? "win" : "lose")

    // Add game to tournament history
    addToHistory({
      round: currentRound,
      opponentName,
      difficulty,
      result: playerWins ? "win" : "loss",
    })

    if (playerWins) {
      // Advance to next round
      setCurrentRound((prev: number) => prev + 1)
      // Start next game after a short delay
      setTimeout(() => {
        setGameActive(true)
        setGameOver(false)
        setPlayerWon(false)
      }, 2000) // 2 second delay to show victory screen
    }
  }

  const restartTournament = (): void => {
    setCurrentRound(1)
    setTournamentHistory([])
    setGameActive(false)
    setGameOver(false)
    setPlayerWon(false)
    setShowIntro(true)
    // Reset difficulty history when starting a new tournament
    resetDifficultyHistory()
    // Clear saved game data
    clearSavedGameData()
    setHasSaved(false)
    soundManager.playSound("start")
  }

  // Limit history size to prevent memory issues
  const addToHistory = (gameResult: GameHistory): void => {
    setTournamentHistory((prev: GameHistory[]) => {
      const newHistory = [...prev, gameResult]

      // Keep only the last 20 games to prevent memory issues
      if (newHistory.length > 20) {
        return newHistory.slice(newHistory.length - 20)
      }
      return newHistory
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-xl">
          <p className="text-xl text-purple-800">Loading game...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 rounded-full border-t-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4 md:p-8">
      {/* Sound toggle button - fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <SoundToggle />
      </div>

      {showIntro ? (
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl p-8 animate-fade-in">
          <div className="flex justify-center mb-6">
            <Trophy className="h-16 w-16 text-amber-500" />
          </div>
          <h1 className="text-4xl font-bold text-center mb-6 text-purple-800">Checkers Tournament Challenge</h1>
          <p className="text-lg text-center mb-8 text-gray-700">
            Face off against a series of opponents at random. How many rounds can you survive?
          </p>

          <div className="flex flex-col items-center space-y-4">
            {hasSaved && (
              <div className="w-full max-w-md bg-purple-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-purple-800">Saved Tournament</h3>
                  <span className="text-sm text-gray-500">{timeSinceLastSave}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  You have a saved tournament at Round {loadTournamentData()?.currentRound}
                </p>
                <button
                  onClick={continueSavedGame}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg flex items-center justify-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Continue Saved Game
                </button>
              </div>
            )}

            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              {hasSaved ? "Start New Tournament" : "Start Tournament"}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-3/4">
              <div className="bg-white rounded-xl shadow-xl p-4 md:p-6 mb-6">
                {gameActive ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-purple-800">Round {currentRound}</h2>
                        <p className="text-gray-600">
                          Opponent: <span className="font-semibold text-indigo-600">{opponentName}</span>
                        </p>
                        <p className="text-gray-600">
                          Difficulty:
                          <span
                            className={`font-semibold ml-1 ${
                              difficulty === "easy"
                                ? "text-green-500"
                                : difficulty === "medium"
                                ? "text-amber-500"
                                : "text-red-500"
                            }`}
                          >
                            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Zap className="h-5 w-5 text-amber-500 mr-1" />
                        <span className="text-lg font-bold text-purple-800">Tournament Mode</span>
                      </div>
                    </div>
                    <GameBoard difficulty={difficulty} onGameEnd={handleGameEnd} currentRound={currentRound} />
                  </>
                ) : gameOver ? (
                  <div className="text-center py-12">
                    {playerWon ? (
                      <div className="animate-bounce-in">
                        <Award className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-green-600 mb-4">Victory!</h2>
                        <p className="text-xl mb-6">You defeated {opponentName}!</p>
                        <button
                          onClick={startGame}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                        >
                          Continue to Round {currentRound}
                        </button>
                      </div>
                    ) : (
                      <div className="animate-fade-in">
                        <h2 className="text-3xl font-bold text-red-600 mb-4">Tournament Over!</h2>
                        <p className="text-xl mb-2">You were defeated by {opponentName}</p>
                        <p className="text-lg mb-6">You reached Round {currentRound}</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                          <button
                            onClick={restartTournament}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                          >
                            Start New Tournament
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h2 className="text-3xl font-bold text-purple-800 mb-4">Ready for Round {currentRound}?</h2>
                    <p className="text-xl mb-6">Click to start your next match!</p>
                    <button
                      onClick={startGame}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    >
                      Start Round
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:w-1/4">
              <TournamentTracker currentRound={currentRound} history={tournamentHistory} />

              {/* Progress saving info */}
              <div className="bg-white rounded-xl shadow-xl p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-purple-800">Auto-Save</h3>
                  <Save className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">
                  Your progress is automatically saved. You can continue your tournament even if you close the browser.
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={restartTournament}
                    className="w-full flex items-center justify-center text-sm text-red-500 hover:text-red-700"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Tournament
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
