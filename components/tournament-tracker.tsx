import { Trophy, Award, X } from "lucide-react"

type HistoryItem = {
  round: number
  opponentName: string
  difficulty: string
  result: "win" | "loss"
}

type Props = {
  currentRound: number
  history: HistoryItem[]
}

export default function TournamentTracker({ currentRound, history }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-purple-800">Tournament Progress</h2>
        <Trophy className="h-5 w-5 text-amber-500" />
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Current Round</p>
        <p className="text-2xl font-bold text-purple-800">{currentRound}</p>
      </div>

      {history.length > 0 ? (
        <div>
          <p className="text-sm text-gray-600 mb-2">Match History</p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {history.map((item, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  item.result === "win"
                    ? "bg-green-100 border-l-4 border-green-500"
                    : "bg-red-100 border-l-4 border-red-500"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">Round {item.round}</span>
                  {item.result === "win" ? (
                    <Award className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-sm">{item.opponentName}</p>
                <p className="text-xs text-gray-600">
                  Difficulty:
                  <span
                    className={`ml-1 font-medium ${
                      item.difficulty === "easy"
                        ? "text-green-600"
                        : item.difficulty === "medium"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p>No matches played yet</p>
        </div>
      )}

      {history.length > 0 && history[history.length - 1].result === "loss" && (
        <div className="mt-4 p-3 bg-purple-100 rounded-lg">
          <p className="font-semibold text-purple-800">Tournament Complete!</p>
          <p className="text-sm text-gray-700">You reached Round {history[history.length - 1].round}</p>
        </div>
      )}
    </div>
  )
}
