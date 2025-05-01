// Array of funny computer opponent names
const computerNames = [
  "Binary Bob",
  "Pixel Pete",
  "Algorithm Alice",
  "Circuit Cathy",
  "Data Dave",
  "Electric Emily",
  "Firewall Fred",
  "Gigabyte Gina",
  "Hacker Harry",
  "Interface Irene",
  "Joystick Jack",
  "Keyboard Kelly",
  "Logic Larry",
  "Microchip Molly",
  "Network Nancy",
  "Optical Oscar",
  "Processor Penny",
  "Quantum Quinn",
  "Router Randy",
  "Silicon Sally",
  "Terabyte Terry",
  "USB Ursula",
  "Virtual Vince",
  "Wireless Wendy",
  "XML Xavier",
  "YAML Yolanda",
  "Zip Zack",
  "Checkerboard Charlie",
  "Diagonal Daisy",
  "King Crusher Kevin",
  "Jump Master Jill",
  "Tactical Tim",
  "Strategic Stella",
  "Checkmate Chuck",
  "Board Baron Betty",
  "Move Maestro Max",
  "Piece Prodigy Paula",
  "Winning Wizard Walter",
  "Domination Donna",
  "Tournament Titan Troy",
]

// Track recent difficulties to prevent repetition
let recentDifficulties: string[] = []

// Generate a random computer name
export function generateComputerName(): string {
  const randomIndex = Math.floor(Math.random() * computerNames.length)
  return computerNames[randomIndex]
}

// Get a random difficulty level, weighted by the current round
// Ensures the same difficulty doesn't appear more than twice in a row
export function getRandomDifficulty(round: number): string {
  // Base probabilities based on round - ADJUSTED TO BE HARDER
  let easyProb: number
  let mediumProb: number
  let hardProb: number

  if (round <= 2) {
    // First two rounds: 50% easy, 40% medium, 10% hard (was 70/30/0)
    easyProb = 0.5
    mediumProb = 0.4
    hardProb = 0.1
  } else if (round <= 5) {
    // Rounds 3-5: 20% easy, 50% medium, 30% hard (was 40/50/10)
    easyProb = 0.2
    mediumProb = 0.5
    hardProb = 0.3
  } else if (round <= 8) {
    // Rounds 6-8: 10% easy, 40% medium, 50% hard (was 20/50/30)
    easyProb = 0.1
    mediumProb = 0.4
    hardProb = 0.5
  } else {
    // Rounds 9+: 0% easy, 30% medium, 70% hard (was 10/40/50)
    easyProb = 0.0
    mediumProb = 0.3
    hardProb = 0.7
  }

  // Check if we have two consecutive same difficulties
  if (
    recentDifficulties.length >= 2 &&
    recentDifficulties[recentDifficulties.length - 1] === recentDifficulties[recentDifficulties.length - 2]
  ) {
    // Get the repeated difficulty
    const repeatedDifficulty = recentDifficulties[recentDifficulties.length - 1]

    // Choose a different difficulty
    let newDifficulty: string

    // Adjust probabilities to exclude the repeated difficulty
    if (repeatedDifficulty === "easy") {
      // Redistribute easy probability to medium and hard
      const totalRemaining = mediumProb + hardProb
      if (totalRemaining === 0) {
        // If no other options, force medium
        newDifficulty = "medium"
      } else {
        // Redistribute proportionally
        const adjustedMediumProb = mediumProb / totalRemaining
        const rand = Math.random()
        newDifficulty = rand < adjustedMediumProb ? "medium" : "hard"
      }
    } else if (repeatedDifficulty === "medium") {
      // Redistribute medium probability to easy and hard
      const totalRemaining = easyProb + hardProb
      if (totalRemaining === 0) {
        // If no other options, randomly choose easy or hard
        newDifficulty = Math.random() < 0.5 ? "easy" : "hard"
      } else {
        // Redistribute proportionally
        const adjustedEasyProb = easyProb / totalRemaining
        const rand = Math.random()
        newDifficulty = rand < adjustedEasyProb ? "easy" : "hard"
      }
    } else {
      // Redistribute hard probability to easy and medium
      const totalRemaining = easyProb + mediumProb
      if (totalRemaining === 0) {
        // If no other options, force medium
        newDifficulty = "medium"
      } else {
        // Redistribute proportionally
        const adjustedEasyProb = easyProb / totalRemaining
        const rand = Math.random()
        newDifficulty = rand < adjustedEasyProb ? "easy" : "medium"
      }
    }

    // Update recent difficulties
    recentDifficulties.push(newDifficulty)
    // Keep only the last 3 difficulties
    if (recentDifficulties.length > 3) {
      recentDifficulties.shift()
    }

    return newDifficulty
  } else {
    // Normal random selection based on probabilities
    const rand = Math.random()
    let difficulty: string

    if (rand < easyProb) {
      difficulty = "easy"
    } else if (rand < easyProb + mediumProb) {
      difficulty = "medium"
    } else {
      difficulty = "hard"
    }

    // Update recent difficulties
    recentDifficulties.push(difficulty)
    // Keep only the last 3 difficulties
    if (recentDifficulties.length > 3) {
      recentDifficulties.shift()
    }

    return difficulty
  }
}

// Reset difficulty history (useful when starting a new tournament)
export function resetDifficultyHistory(): void {
  recentDifficulties = []
}
