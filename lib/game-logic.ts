type Piece = {
  id: number
  player: "player" | "computer"
  isKing: boolean
  position: [number, number]
}

export function calculateValidMoves(piece: Piece, board: (Piece | null)[][], jumpOnly: boolean): [number, number][] {
  const [row, col] = piece.position
  const validMoves: [number, number][] = []

  // Direction of movement (player moves up, computer moves down)
  const directions: [number, number][] = []

  // Only calculate directions once
  if (piece.player === "player" || piece.isKing) {
    // Can move up
    directions.push([-1, -1], [-1, 1])
  }

  if (piece.player === "computer" || piece.isKing) {
    // Can move down
    directions.push([1, -1], [1, 1])
  }

  // Check for jumps first - this is mandatory
  let hasJump = false

  for (const [dRow, dCol] of directions) {
    const jumpRow = row + dRow * 2
    const jumpCol = col + dCol * 2

    // Skip calculations if out of bounds
    if (jumpRow < 0 || jumpRow >= 8 || jumpCol < 0 || jumpCol >= 8) continue

    const midRow = row + dRow
    const midCol = col + dCol

    const midPiece = board[midRow]?.[midCol]
    const jumpSquare = board[jumpRow]?.[jumpCol]

    // If there's an opponent's piece to jump over and the landing square is empty
    if (midPiece && midPiece.player !== piece.player && !jumpSquare) {
      validMoves.push([jumpRow, jumpCol])
      hasJump = true
    }
  }

  // If jumps are available or we're only looking for jumps, return now
  if (hasJump || jumpOnly) {
    return validMoves
  }

  // Otherwise, check for regular moves
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow
    const newCol = col + dCol

    // Skip calculations if out of bounds
    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) continue

    // Check if the square is empty
    if (!board[newRow]?.[newCol]) {
      validMoves.push([newRow, newCol])
    }
  }

  return validMoves
}

// Evaluate board position for computer (higher is better for computer)
function evaluateBoard(board: (Piece | null)[][], pieces: Piece[]): number {
  let score = 0

  // Count pieces with weights
  for (const piece of pieces) {
    // Basic piece value
    const pieceValue = piece.isKing ? 3 : 1

    if (piece.player === "computer") {
      score += pieceValue

      // Position-based scoring for computer pieces
      const [row, col] = piece.position

      // Favor center control
      const centerBonus = Math.abs(3.5 - row) + Math.abs(3.5 - col) <= 2 ? 0.3 : 0
      score += centerBonus

      // Favor back row for non-kings (defensive)
      if (!piece.isKing && row === 7) {
        score += 0.5
      }

      // Favor advancement for non-kings
      if (!piece.isKing) {
        score += row * 0.1 // Incentivize moving toward king row
      }
    } else {
      score -= pieceValue

      // Position-based scoring for player pieces
      const [row, col] = piece.position

      // Penalize player center control
      const centerBonus = Math.abs(3.5 - row) + Math.abs(3.5 - col) <= 2 ? 0.3 : 0
      score -= centerBonus

      // Penalize player back row pieces
      if (!piece.isKing && row === 0) {
        score -= 0.5
      }
    }
  }

  return score
}

export function makeComputerMove(board: (Piece | null)[][], pieces: Piece[], difficulty: string) {
  try {
    // Get all computer pieces - only calculate once
    const computerPieces = pieces.filter((p) => p.player === "computer")

    if (computerPieces.length === 0) return null

    // Check for jumps first - jumps are mandatory
    let piecesWithMoves = []
    let jumpAvailable = false

    // First pass - check for jumps
    for (const piece of computerPieces) {
      const moves = calculateValidMoves(piece, board, true)
      if (moves.length > 0) {
        piecesWithMoves.push({ piece, moves })
        jumpAvailable = true
      }
    }

    // If no jumps, look for regular moves
    if (!jumpAvailable) {
      piecesWithMoves = []
      for (const piece of computerPieces) {
        const moves = calculateValidMoves(piece, board, false)
        if (moves.length > 0) {
          piecesWithMoves.push({ piece, moves })
        }
      }
    }

    if (piecesWithMoves.length > 0) {
      return executeComputerMove(piecesWithMoves, board, pieces, difficulty, jumpAvailable)
    }

    // No valid moves
    return null
  } catch (error) {
    console.error("Error in makeComputerMove:", error)
    return null
  }
}

function executeComputerMove(
  piecesWithMoves: { piece: Piece; moves: [number, number][] }[],
  board: (Piece | null)[][],
  pieces: Piece[],
  difficulty: string,
  isJump: boolean,
) {
  try {
    // Early return for simple cases
    if (piecesWithMoves.length === 1 && piecesWithMoves[0].moves.length === 1) {
      // Only one possible move, no need for complex logic
      return executeMove(
        {
          piece: piecesWithMoves[0].piece,
          move: piecesWithMoves[0].moves[0],
        },
        board,
        pieces,
        isJump,
      )
    }

    // Copy the board and pieces
    const newBoard = [...board.map((row) => [...row])]
    const newPieces = [...pieces]

    // Choose which piece to move based on difficulty
    let chosenMove: { piece: Piece; move: [number, number] }

    if (difficulty === "easy") {
      // Easy: Random move with slight preference for better moves
      const allMoves: { piece: Piece; move: [number, number]; score: number }[] = []

      // Evaluate all possible moves
      for (const { piece, moves } of piecesWithMoves) {
        for (const move of moves) {
          // Simulate the move
          const simResult = simulateMove(piece, move, [...board.map((row) => [...row])], [...pieces], isJump)
          if (simResult) {
            const score = evaluateBoard(simResult.board, simResult.pieces)
            allMoves.push({ piece, move, score })
          }
        }
      }

      // Sort moves by score
      allMoves.sort((a, b) => b.score - a.score)

      // 70% chance to pick a random move, 30% chance to pick from top half
      if (Math.random() < 0.7) {
        const randomIndex = Math.floor(Math.random() * allMoves.length)
        chosenMove = {
          piece: allMoves[randomIndex].piece,
          move: allMoves[randomIndex].move,
        }
      } else {
        // Pick from top half of moves
        const topHalfIndex = Math.floor(Math.random() * Math.ceil(allMoves.length / 2))
        chosenMove = {
          piece: allMoves[topHalfIndex].piece,
          move: allMoves[topHalfIndex].move,
        }
      }
    } else if (difficulty === "medium") {
      // Medium: Smarter move selection with some randomness
      const allMoves: { piece: Piece; move: [number, number]; score: number }[] = []

      // Evaluate all possible moves
      for (const { piece, moves } of piecesWithMoves) {
        for (const move of moves) {
          // Simulate the move
          const simResult = simulateMove(piece, move, [...board.map((row) => [...row])], [...pieces], isJump)
          if (simResult) {
            const score = evaluateBoard(simResult.board, simResult.pieces)
            allMoves.push({ piece, move, score })
          }
        }
      }

      // Sort moves by score
      allMoves.sort((a, b) => b.score - a.score)

      // 50% chance to pick from top third, 30% from middle third, 20% from bottom third
      const rand = Math.random()
      let selectedIndex: number

      if (allMoves.length <= 3) {
        // For few moves, prefer better ones
        if (rand < 0.7) {
          selectedIndex = 0
        } else {
          selectedIndex = Math.floor(Math.random() * allMoves.length)
        }
      } else {
        const third = Math.ceil(allMoves.length / 3)

        if (rand < 0.5) {
          // Top third
          selectedIndex = Math.floor(Math.random() * third)
        } else if (rand < 0.8) {
          // Middle third
          selectedIndex = Math.floor(Math.random() * third) + third
        } else {
          // Bottom third
          selectedIndex = Math.floor(Math.random() * third) + 2 * third
        }

        // Ensure index is valid
        selectedIndex = Math.min(selectedIndex, allMoves.length - 1)
      }

      chosenMove = {
        piece: allMoves[selectedIndex].piece,
        move: allMoves[selectedIndex].move,
      }
    } else {
      // Hard: Strategic moves with minimal randomness
      const allMoves: { piece: Piece; move: [number, number]; score: number }[] = []

      // First priority: jumps that lead to multiple jumps
      if (isJump) {
        for (const { piece, moves } of piecesWithMoves) {
          for (const move of moves) {
            // Simulate the jump
            const simResult = simulateMove(piece, move, [...board.map((row) => [...row])], [...pieces], true)
            if (!simResult) continue

            // Check if more jumps are available
            const movedPiece = simResult.pieces.find(
              (p) => p.id === piece.id && p.position[0] === move[0] && p.position[1] === move[1],
            )

            if (movedPiece) {
              const moreJumps = calculateValidMoves(movedPiece, simResult.board, true)

              if (moreJumps.length > 0) {
                // Prioritize multi-jumps highly
                allMoves.push({
                  piece,
                  move,
                  score: evaluateBoard(simResult.board, simResult.pieces) + 5, // Bonus for multi-jump
                })
              } else {
                // Regular jump
                allMoves.push({
                  piece,
                  move,
                  score: evaluateBoard(simResult.board, simResult.pieces),
                })
              }
            }
          }
        }

        // If we found multi-jumps, pick the best one
        if (allMoves.length > 0) {
          allMoves.sort((a, b) => b.score - a.score)

          // 80% chance to pick the best move, 20% chance for second best
          if (allMoves.length > 1 && Math.random() < 0.2) {
            chosenMove = {
              piece: allMoves[1].piece,
              move: allMoves[1].move,
            }
          } else {
            chosenMove = {
              piece: allMoves[0].piece,
              move: allMoves[0].move,
            }
          }

          return executeMove(chosenMove, newBoard, newPieces, isJump)
        }
      }

      // Evaluate all possible moves
      for (const { piece, moves } of piecesWithMoves) {
        for (const move of moves) {
          // Simulate the move
          const simResult = simulateMove(piece, move, [...board.map((row) => [...row])], [...pieces], isJump)
          if (simResult) {
            let score = evaluateBoard(simResult.board, simResult.pieces)

            // Special case: becoming king
            const [fromRow, _] = piece.position
            const [toRow, __] = move
            if (!piece.isKing && toRow === 7) {
              score += 2 // Big bonus for becoming king
            }

            // Special case: protecting back row
            if (!piece.isKing && fromRow === 7 && toRow === 7) {
              score += 0.5 // Bonus for staying in back row
            }

            allMoves.push({ piece, move, score })
          }
        }
      }

      // Sort moves by score
      allMoves.sort((a, b) => b.score - a.score)

      // 90% chance to pick the best move, 10% chance for second best (if available)
      if (allMoves.length > 1 && Math.random() < 0.1) {
        chosenMove = {
          piece: allMoves[1].piece,
          move: allMoves[1].move,
        }
      } else {
        chosenMove = {
          piece: allMoves[0].piece,
          move: allMoves[0].move,
        }
      }
    }

    return executeMove(chosenMove, newBoard, newPieces, isJump)
  } catch (error) {
    console.error("Error in executeComputerMove:", error)

    // Fallback to a simple random move if there's an error
    if (piecesWithMoves.length > 0) {
      const randomPieceIndex = Math.floor(Math.random() * piecesWithMoves.length)
      const randomPiece = piecesWithMoves[randomPieceIndex]
      const randomMoveIndex = Math.floor(Math.random() * randomPiece.moves.length)

      const fallbackMove = {
        piece: randomPiece.piece,
        move: randomPiece.moves[randomMoveIndex],
      }

      return executeMove(fallbackMove, board, pieces, isJump)
    }

    return null
  }
}

// Simulate a move without changing the actual game state
function simulateMove(
  piece: Piece,
  move: [number, number],
  board: (Piece | null)[][],
  pieces: Piece[],
  isJump: boolean,
) {
  try {
    const [fromRow, fromCol] = piece.position
    const [toRow, toCol] = move

    // Update the board
    board[fromRow][fromCol] = null

    // Handle jump
    if (Math.abs(toRow - fromRow) === 2) {
      const jumpedRow = (fromRow + toRow) / 2
      const jumpedCol = (fromCol + toCol) / 2
      const jumpedPiece = board[jumpedRow][jumpedCol]

      if (jumpedPiece) {
        // Remove jumped piece from board
        board[jumpedRow][jumpedCol] = null

        // Remove from pieces array
        const jumpedIndex = pieces.findIndex((p) => p.id === jumpedPiece.id)
        if (jumpedIndex !== -1) {
          pieces.splice(jumpedIndex, 1)
        }
      }
    }

    // Check if piece becomes king
    const isKing = piece.isKing || (piece.player === "computer" && toRow === 7)

    // Update the piece
    const updatedPiece = {
      ...piece,
      position: [toRow, toCol] as [number, number],
      isKing,
    }

    // Update board
    board[toRow][toCol] = updatedPiece

    // Update pieces array
    const pieceIndex = pieces.findIndex((p) => p.id === piece.id)
    if (pieceIndex !== -1) {
      pieces[pieceIndex] = updatedPiece
    }

    return { board, pieces }
  } catch (error) {
    console.error("Error in simulateMove:", error)
    return null
  }
}

function executeMove(
  chosenMove: { piece: Piece; move: [number, number] },
  board: (Piece | null)[][],
  pieces: Piece[],
  isJump: boolean,
) {
  try {
    const { piece, move } = chosenMove
    const [fromRow, fromCol] = piece.position
    const [toRow, toCol] = move

    // Update the board
    board[fromRow][fromCol] = null

    // Check if this is a jump
    let jumped = false
    if (Math.abs(toRow - fromRow) === 2) {
      jumped = true
      // Remove the jumped piece
      const jumpedRow = (fromRow + toRow) / 2
      const jumpedCol = (fromCol + toCol) / 2
      const jumpedPiece = board[jumpedRow][jumpedCol]

      if (jumpedPiece) {
        // Remove from board
        board[jumpedRow][jumpedCol] = null

        // Remove from pieces array
        const jumpedIndex = pieces.findIndex((p) => p.id === jumpedPiece.id)
        if (jumpedIndex !== -1) {
          pieces.splice(jumpedIndex, 1)
        }
      }
    }

    // Check if piece becomes king
    let isKing = piece.isKing
    if (toRow === 7) {
      isKing = true
    }

    // Update the piece
    const movedPiece = {
      ...piece,
      position: [toRow, toCol] as [number, number],
      isKing,
    }

    // Update the board
    board[toRow][toCol] = movedPiece

    // Update the pieces array
    const pieceIndex = pieces.findIndex((p) => p.id === piece.id)
    if (pieceIndex !== -1) {
      pieces[pieceIndex] = movedPiece
    }

    return {
      updatedBoard: board,
      updatedPieces: pieces,
      jumped,
      movedPiece,
    }
  } catch (error) {
    console.error("Error in executeMove:", error)
    return null
  }
}
