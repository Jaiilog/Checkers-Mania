"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { calculateValidMoves, makeComputerMove } from "@/lib/game-logic"
import soundManager from "@/lib/sound-manager"
import { saveGameData, loadGameData } from "@/lib/storage-utils"
import { AlertTriangle } from "lucide-react"

type Piece = {
  id: number
  player: "player" | "computer"
  isKing: boolean
  position: [number, number]
}

type Props = {
  difficulty: string
  onGameEnd: (playerWins: boolean) => void
  currentRound: number
}

export default function GameBoard({ difficulty, onGameEnd, currentRound }: Props) {
  const [board, setBoard] = useState<(Piece | null)[][]>(
    Array(8)
      .fill(null)
      .map(() => Array(8).fill(null)),
  )
  const [pieces, setPieces] = useState<Piece[]>([])
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null)
  const [validMoves, setValidMoves] = useState<[number, number][]>([])
  const [currentTurn, setCurrentTurn] = useState<"player" | "computer">("player")
  const [jumpAvailable, setJumpAvailable] = useState(false)
  const [gameStatus, setGameStatus] = useState<"playing" | "player_won" | "computer_won">("playing")
  const [isThinking, setIsThinking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [computerStuck, setComputerStuck] = useState(false)
  const [thinkingTime, setThinkingTime] = useState(0)

  // Refs for tracking timeouts and game state
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevGameStatusRef = useRef(gameStatus)
  const computerMovingRef = useRef(false)
  const initializedRef = useRef(false)
  const currentRoundRef = useRef(currentRound)
  const maxThinkingTimeRef = useRef(10) // Maximum thinking time in seconds

  // Update currentRoundRef when currentRound changes
  useEffect(() => {
    currentRoundRef.current = currentRound
  }, [currentRound])

  // Initialize the board or load saved game
  useEffect(() => {
    if (initializedRef.current) return

    const loadSavedGame = async () => {
      const savedGameData = loadGameData()

      if (savedGameData && savedGameData.board && savedGameData.pieces) {
        // Restore the saved game state
        setBoard(savedGameData.board)
        setPieces(savedGameData.pieces)
        setCurrentTurn(savedGameData.currentTurn)
        setGameStatus("playing")
        initializedRef.current = true
      } else {
        // No saved game, initialize a new one
        initializeGame()
      }

      setIsLoading(false)
    }

    loadSavedGame()

    return () => {
      // Clean up any pending operations
      clearAllTimeouts()
    }
  }, [])

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoading && initializedRef.current) {
      saveGameData({
        board,
        pieces,
        currentTurn,
        lastUpdated: Date.now(),
      })
    }
  }, [board, pieces, currentTurn, isLoading])

  // Handle computer's turn
  useEffect(() => {
    if (currentTurn === "computer" && gameStatus === "playing" && !isLoading) {
      handleComputerTurn()
    }
  }, [currentTurn, gameStatus, isLoading])

  // Check for game over conditions
  useEffect(() => {
    if (!isLoading) {
      checkGameStatus()
    }
  }, [pieces, currentTurn, isLoading])

  // Play sounds when game status changes
  useEffect(() => {
    if (prevGameStatusRef.current !== gameStatus) {
      if (gameStatus === "player_won") {
        soundManager.playSound("win")
      } else if (gameStatus === "computer_won") {
        soundManager.playSound("lose")
      }
      prevGameStatusRef.current = gameStatus
    }
  }, [gameStatus])

  // Thinking timer for computer turn
  useEffect(() => {
    if (isThinking) {
      setThinkingTime(0)

      // Start a timer to track thinking time
      thinkingTimerRef.current = setInterval(() => {
        setThinkingTime((prev) => {
          const newTime = prev + 1

          // If thinking time exceeds max, show stuck message
          if (newTime >= maxThinkingTimeRef.current && !computerStuck) {
            setComputerStuck(true)
          }

          return newTime
        })
      }, 1000)
    } else {
      // Clear thinking timer when not thinking
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current)
        thinkingTimerRef.current = null
      }

      // Reset stuck state when computer finishes thinking
      if (computerStuck) {
        setComputerStuck(false)
      }
    }

    return () => {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current)
        thinkingTimerRef.current = null
      }
    }
  }, [isThinking, computerStuck])

  // Helper function to clear all timeouts
  const clearAllTimeouts = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current)
      thinkingTimerRef.current = null
    }
  }

  const initializeGame = () => {
    const initialPieces: Piece[] = []
    const newBoard = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null))

    let id = 1

    // Set up player pieces (bottom of board)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          const piece = {
            id: id++,
            player: "player",
            isKing: false,
            position: [row, col] as [number, number],
          }
          initialPieces.push(piece)
          newBoard[row][col] = piece
        }
      }
    }

    // Set up computer pieces (top of board)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          const piece = {
            id: id++,
            player: "computer",
            isKing: false,
            position: [row, col] as [number, number],
          }
          initialPieces.push(piece)
          newBoard[row][col] = piece
        }
      }
    }

    setPieces(initialPieces)
    setBoard(newBoard)
    setCurrentTurn("player")
    setGameStatus("playing")
    computerMovingRef.current = false
    initializedRef.current = true

    // Play start sound
    soundManager.playSound("start")
  }

  const handleComputerTurn = () => {
    // Prevent multiple calls to handleComputerTurn
    if (computerMovingRef.current) return
    computerMovingRef.current = true

    setIsThinking(true)
    setComputerStuck(false)

    // Clear any existing timeouts
    clearAllTimeouts()

    // Add a delay to simulate "thinking" - longer for harder difficulties
    const thinkTime = difficulty === "easy" ? 800 : difficulty === "medium" ? 1200 : 1600

    // Set a safety timeout to ensure the computer's turn always completes
    // This will trigger if the normal flow doesn't complete within a reasonable time
    safetyTimeoutRef.current = setTimeout(() => {
      if (currentTurn === "computer" && gameStatus === "playing") {
        console.log("Safety timeout triggered - computer turn recovery")
        completeComputerTurn()
      }
    }, thinkTime + 3000) // 3 seconds longer than the thinking time

    // Normal computer turn flow
    intervalRef.current = setTimeout(() => {
      completeComputerTurn()
    }, thinkTime)
  }

  // Function to force computer turn completion (for when it gets stuck)
  const forceComputerTurnCompletion = () => {
    if (currentTurn === "computer" && gameStatus === "playing") {
      completeComputerTurn()
    }
  }

  // Separate function to complete the computer's turn to avoid code duplication
  const completeComputerTurn = () => {
    // Clear timeouts since we're now processing the turn
    clearAllTimeouts()

    // Check if component is still in a valid state for computer's turn
    if (currentTurn !== "computer" || gameStatus !== "playing") {
      setIsThinking(false)
      computerMovingRef.current = false
      return
    }

    try {
      // Get computer pieces to check if any are available
      const computerPieces = pieces.filter((p) => p.player === "computer")

      if (computerPieces.length === 0) {
        // No computer pieces left, player wins
        setGameStatus("player_won")
        onGameEnd(true)
        setIsThinking(false)
        computerMovingRef.current = false
        return
      }

      // Check if computer has any valid moves
      let hasValidMoves = false
      for (const piece of computerPieces) {
        const jumps = calculateValidMoves(piece, board, true)
        if (jumps.length > 0) {
          hasValidMoves = true
          break
        }

        const regularMoves = calculateValidMoves(piece, board, false)
        if (regularMoves.length > 0) {
          hasValidMoves = true
          break
        }
      }

      if (!hasValidMoves) {
        // Computer has no valid moves, player wins
        setGameStatus("player_won")
        onGameEnd(true)
        setIsThinking(false)
        computerMovingRef.current = false
        return
      }

      // Make the computer move
      const result = makeComputerMove(board, pieces, difficulty)

      if (result) {
        const { updatedBoard, updatedPieces, jumped, movedPiece } = result

        // Play appropriate sound
        if (jumped) {
          soundManager.playSound("jump")
        } else {
          soundManager.playSound("move")
        }

        // Check if piece became king
        if (!movedPiece.isKing && movedPiece.position[0] === 7) {
          soundManager.playSound("king")
        }

        setBoard(updatedBoard)
        setPieces(updatedPieces)

        // If a jump was made and more jumps are available, computer gets another turn
        if (jumped && hasMoreJumps(movedPiece, updatedBoard)) {
          // Computer gets another turn - reset the computer moving flag and call handleComputerTurn again
          computerMovingRef.current = false
          setTimeout(() => {
            handleComputerTurn()
          }, 500) // Small delay between consecutive jumps
        } else {
          setCurrentTurn("player")
          computerMovingRef.current = false
        }
      } else {
        // No valid moves for computer (this shouldn't happen due to our checks above, but just in case)
        setGameStatus("player_won")
        onGameEnd(true)
        computerMovingRef.current = false
      }
    } catch (error) {
      console.error("Error during computer turn:", error)
      // Recover from error by giving turn to player
      setCurrentTurn("player")
      computerMovingRef.current = false
    }

    setIsThinking(false)
  }

  const handleSquareClick = (row: number, col: number) => {
    if (currentTurn !== "player" || gameStatus !== "playing" || isThinking) return

    // If clicking on a valid move square
    if (selectedPiece && validMoves.some(([r, c]) => r === row && c === col)) {
      movePiece(selectedPiece, row, col)
      return
    }

    // If clicking on a piece
    const clickedPiece = board[row][col]

    if (clickedPiece && clickedPiece.player === "player") {
      setSelectedPiece(clickedPiece)

      // Always show all possible moves for the player (both regular and jumps)
      // First check if this piece can jump
      const jumpMoves = memoizedCalculateValidMoves(clickedPiece, board, true)

      if (jumpMoves.length > 0) {
        // If jumps are available for this piece, show them
        setValidMoves(jumpMoves)
      } else {
        // Otherwise show regular moves
        const regularMoves = memoizedCalculateValidMoves(clickedPiece, board, false)
        setValidMoves(regularMoves)
      }
    } else {
      // Clicking on empty square or opponent's piece
      setSelectedPiece(null)
      setValidMoves([])
    }
  }

  const movePiece = (piece: Piece, toRow: number, toCol: number) => {
    const [fromRow, fromCol] = piece.position
    const newBoard = [...board.map((row) => [...row])]
    const newPieces = [...pieces]

    // Check if this is a jump move
    const isJump = Math.abs(toRow - fromRow) === 2

    if (isJump) {
      // Remove the jumped piece
      const jumpedRow = (fromRow + toRow) / 2
      const jumpedCol = (fromCol + toCol) / 2
      const jumpedPiece = newBoard[jumpedRow][jumpedCol]

      if (jumpedPiece) {
        // Remove from board
        newBoard[jumpedRow][jumpedCol] = null

        // Remove from pieces array
        const jumpedIndex = newPieces.findIndex((p) => p.id === jumpedPiece.id)
        if (jumpedIndex !== -1) {
          newPieces.splice(jumpedIndex, 1)
        }
      }
    }

    // Update the board
    newBoard[fromRow][fromCol] = null

    // Check if piece becomes king
    let isKing = piece.isKing
    const becomingKing =
      !isKing && ((piece.player === "player" && toRow === 0) || (piece.player === "computer" && toRow === 7))

    if (becomingKing) {
      isKing = true
    }

    // Update the piece
    const updatedPiece = {
      ...piece,
      position: [toRow, toCol] as [number, number],
      isKing,
    }

    // Update the board and pieces
    newBoard[toRow][toCol] = updatedPiece

    // Update the pieces array
    const pieceIndex = newPieces.findIndex((p) => p.id === piece.id)
    if (pieceIndex !== -1) {
      newPieces[pieceIndex] = updatedPiece
    }

    setBoard(newBoard)
    setPieces(newPieces)

    // Play appropriate sound
    if (isJump) {
      soundManager.playSound("jump")
    } else {
      soundManager.playSound("move")
    }

    // Play king sound if piece became king
    if (becomingKing) {
      soundManager.playSound("king")
    }

    // Check if more jumps are available for this piece
    if (isJump && hasMoreJumps(updatedPiece, newBoard)) {
      setSelectedPiece(updatedPiece)
      setValidMoves(memoizedCalculateValidMoves(updatedPiece, newBoard, true))
    } else {
      setSelectedPiece(null)
      setValidMoves([])
      setCurrentTurn("computer")
    }
  }

  const hasMoreJumps = useCallback((piece: Piece, currentBoard: (Piece | null)[][]) => {
    const jumps = calculateValidMoves(piece, currentBoard, true)
    return jumps.length > 0
  }, [])

  const canJump = (piece: Piece, currentBoard: (Piece | null)[][]) => {
    const jumps = calculateValidMoves(piece, currentBoard, true)
    return jumps.length > 0
  }

  // Memoize valid moves calculation to improve performance
  const memoizedCalculateValidMoves = useCallback(
    (piece: Piece, currentBoard: (Piece | null)[][], jumpOnly: boolean) => {
      return calculateValidMoves(piece, currentBoard, jumpOnly)
    },
    [], // Empty dependency array since the function doesn't depend on component state
  )

  const checkGameStatus = () => {
    if (pieces.length === 0 || gameStatus !== "playing") return

    // Check if any player has no pieces left
    const playerPieces = pieces.filter((p) => p.player === "player")
    const computerPieces = pieces.filter((p) => p.player === "computer")

    if (playerPieces.length === 0) {
      setGameStatus("computer_won")
      onGameEnd(false)
      return
    }

    if (computerPieces.length === 0) {
      setGameStatus("player_won")
      onGameEnd(true)
      return
    }

    // Check if current player has any valid moves
    const currentPlayerPieces = pieces.filter((p) => p.player === currentTurn)

    // Check if any jumps are available
    let anyJumpsAvailable = false

    for (const piece of currentPlayerPieces) {
      const jumps = memoizedCalculateValidMoves(piece, board, true)
      if (jumps.length > 0) {
        anyJumpsAvailable = true
        break
      }
    }

    // Set jumpAvailable state for UI purposes (but don't enforce it for player)
    setJumpAvailable(anyJumpsAvailable)

    // For computer, we still enforce jumps
    // For player, we just check if any moves are available
    if (currentTurn === "computer" && !anyJumpsAvailable) {
      // Check if computer has any moves available
      let anyMovesAvailable = false

      for (const piece of currentPlayerPieces) {
        const moves = memoizedCalculateValidMoves(piece, board, false)
        if (moves.length > 0) {
          anyMovesAvailable = true
          break
        }
      }

      if (!anyMovesAvailable) {
        setGameStatus("player_won")
        onGameEnd(true)
      }
    } else if (currentTurn === "player") {
      // For player, check if any moves (jumps or regular) are available
      let anyPlayerMovesAvailable = anyJumpsAvailable // Already checked jumps

      if (!anyPlayerMovesAvailable) {
        // Check regular moves
        for (const piece of currentPlayerPieces) {
          const moves = memoizedCalculateValidMoves(piece, board, false)
          if (moves.length > 0) {
            anyPlayerMovesAvailable = true
            break
          }
        }

        if (!anyPlayerMovesAvailable) {
          setGameStatus("computer_won")
          onGameEnd(false)
        }
      }
    }
  }

  const getSquareColor = (row: number, col: number) => {
    // Checkerboard pattern
    const isBlackSquare = (row + col) % 2 === 1

    if (isBlackSquare) {
      // Check if this is a valid move
      const isValidMove = validMoves.some(([r, c]) => r === row && c === col)

      if (isValidMove) {
        return "bg-green-400 cursor-pointer"
      }

      // Check if this square has the selected piece
      const hasPiece = board[row][col]
      if (hasPiece && selectedPiece && hasPiece.id === selectedPiece.id) {
        return "bg-blue-400"
      }

      return "bg-gray-700"
    }

    return "bg-gray-200"
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending operations
      clearAllTimeouts()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {isThinking && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10 rounded-lg">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-lg font-semibold text-purple-800">Computer is thinking...</p>
            <div className="mt-2 flex justify-center">
              <div className="animate-bounce h-2 w-2 bg-purple-600 rounded-full mx-1"></div>
              <div
                className="animate-bounce h-2 w-2 bg-purple-600 rounded-full mx-1"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="animate-bounce h-2 w-2 bg-purple-600 rounded-full mx-1"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>

            {computerStuck && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center text-amber-600 mb-2">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <p className="text-sm font-medium">Computer seems stuck</p>
                </div>
                <button
                  onClick={forceComputerTurnCompletion}
                  className="w-full py-2 px-3 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                >
                  Force Computer Move
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-8 gap-0 border-4 border-amber-800 rounded-lg overflow-hidden shadow-xl">
        {Array(8)
          .fill(null)
          .map((_, row) =>
            Array(8)
              .fill(null)
              .map((_, col) => {
                const piece = board[row][col]

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`aspect-square ${getSquareColor(row, col)} flex items-center justify-center relative`}
                    onClick={() => handleSquareClick(row, col)}
                  >
                    {piece && (
                      <div
                        className={`w-4/5 h-4/5 rounded-full ${
                          piece.player === "player" ? "bg-red-500" : "bg-black"
                        } shadow-md flex items-center justify-center ${
                          piece.player === "player" && currentTurn === "player" ? "cursor-pointer" : ""
                        }`}
                      >
                        {piece.isKing && (
                          <div className="w-1/2 h-1/2 rounded-full bg-amber-300 flex items-center justify-center">
                            <span className="text-xs font-bold">K</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }),
          )}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {currentTurn === "player" ? (
            <span className="font-semibold text-red-500">Your turn</span>
          ) : (
            <span className="font-semibold text-black">Computer's turn</span>
          )}
        </div>

        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span className="mr-4">You</span>

          <div className="w-4 h-4 rounded-full bg-black mr-2"></div>
          <span>Computer</span>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <span>Round {currentRoundRef.current} • </span>
        <span>Progress saved automatically</span>
      </div>
    </div>
  )
}
