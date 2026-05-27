import { calculatePlayTime } from '../store/gameTime'

export default function PlayTimeSummary({ game, players }) {
  const playTime = calculatePlayTime(game, players)
  const totalGameMinutes = 60

  const sorted = [...players].sort((a, b) => (playTime[b.id] || 0) - (playTime[a.id] || 0))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-300">Play Time Summary</h3>
      <div className="space-y-1.5">
        {sorted.map(player => {
          const minutes = playTime[player.id] || 0
          const percent = (minutes / totalGameMinutes) * 100
          return (
            <div key={player.id} className="flex items-center gap-2">
              <span className="text-sm text-white w-28 truncate">{player.name}</span>
              <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    minutes === 0 ? '' : percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-12 text-right">{minutes} min</span>
            </div>
          )
        })}
      </div>
      {players.length > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          Target: {totalGameMinutes} min total game time. Each player ideal: ~{Math.round(totalGameMinutes * 9 / players.length)} min
        </p>
      )}
    </div>
  )
}
