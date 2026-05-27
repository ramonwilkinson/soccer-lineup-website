export function calculatePlayTime(game, players) {
  if (!game || !game.configurations || game.configurations.length === 0) return {}

  const sorted = [...game.configurations].sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half
    return a.minute - b.minute
  })

  const playerMinutes = {}
  players.forEach(p => { playerMinutes[p.id] = 0 })

  const hasSecondHalf = sorted.some(c => c.half === 2)
  const lastFirstHalfConfig = [...sorted].reverse().find(c => c.half === 1)

  for (let i = 0; i < sorted.length; i++) {
    const config = sorted[i]
    const nextConfig = sorted[i + 1]

    let endMinute
    if (nextConfig && nextConfig.half === config.half) {
      endMinute = nextConfig.minute
    } else {
      endMinute = 30
    }

    const duration = endMinute - config.minute

    Object.values(config.assignments).forEach(playerId => {
      if (playerMinutes[playerId] !== undefined) {
        playerMinutes[playerId] += duration
      }
    })
  }

  // If no 2nd half config exists, carry the last 1st half config for the full 2nd half
  if (!hasSecondHalf && lastFirstHalfConfig) {
    Object.values(lastFirstHalfConfig.assignments).forEach(playerId => {
      if (playerMinutes[playerId] !== undefined) {
        playerMinutes[playerId] += 30
      }
    })
  }

  return playerMinutes
}
