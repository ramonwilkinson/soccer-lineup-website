const FORMATION_POSITIONS = [
  { id: 'gk', label: 'GK', row: 0, col: 1 },
  { id: 'def-l', label: 'LB', row: 1, col: 0 },
  { id: 'def-c', label: 'FB', row: 1, col: 1 },
  { id: 'def-r', label: 'RB', row: 1, col: 2 },
  { id: 'mid-c', label: 'CDM', row: 2, col: 1 },
  { id: 'att-l', label: 'LW', row: 3, col: 0 },
  { id: 'att-c', label: 'CAM', row: 3, col: 1 },
  { id: 'att-r', label: 'RW', row: 3, col: 2 },
  { id: 'str', label: 'STR', row: 4, col: 1 },
]

const POS_LABEL_MAP = Object.fromEntries(FORMATION_POSITIONS.map(p => [p.id, p.label]))

function getChanges(prevConfig, config, players) {
  if (!prevConfig) return []

  const prev = prevConfig.assignments
  const curr = config.assignments

  const prevOnPitch = new Set(Object.values(prev))
  const currOnPitch = new Set(Object.values(curr))

  const ons = []
  const offs = []
  const moves = []

  for (const [posId, playerId] of Object.entries(curr)) {
    const player = players.find(p => p.id === playerId)
    if (!player) continue

    if (!prevOnPitch.has(playerId)) {
      ons.push(`${player.name} ON to ${POS_LABEL_MAP[posId]}`)
    } else {
      const prevPosId = Object.entries(prev).find(([, pid]) => pid === playerId)?.[0]
      if (prevPosId && prevPosId !== posId) {
        moves.push(`${player.name} to ${POS_LABEL_MAP[posId]}`)
      }
    }
  }

  for (const playerId of Object.values(prev)) {
    if (!currOnPitch.has(playerId)) {
      const player = players.find(p => p.id === playerId)
      if (player) offs.push(`${player.name} OFF`)
    }
  }

  return [...ons, ...offs, ...moves]
}

function PrintPitch({ config, prevConfig, players, benchOrder }) {
  const rows = [4, 3, 2, 1, 0]
  const assignedIds = new Set(Object.values(config.assignments))
  const benchUnsorted = players.filter(p => !assignedIds.has(p.id))
  const bench = benchOrder
    ? [...benchUnsorted].sort((a, b) => {
        const ai = benchOrder.indexOf(a.id)
        const bi = benchOrder.indexOf(b.id)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : benchUnsorted

  const changes = config.minute !== 0 ? getChanges(prevConfig, config, players) : []

  return (
    <div className="print-config">
      <div className="print-config-header">H{config.half} {config.minute}'</div>
      {changes.length > 0 && (
        <div className="print-changes">
          {changes.map((c, i) => <div key={i}>{c}</div>)}
        </div>
      )}
      <div className="print-pitch-layout">
        <div className="print-pitch">
          {rows.map(row => {
            const positionsInRow = FORMATION_POSITIONS.filter(p => p.row === row)
            if (positionsInRow.length === 0) return null
            return (
              <div key={row} className="print-row">
                {positionsInRow.map(pos => {
                  const playerId = config.assignments[pos.id]
                  const player = playerId ? players.find(p => p.id === playerId) : null
                  return (
                    <div key={pos.id} className="print-slot">
                      <span className="print-pos-label">{pos.label}</span>
                      <span className="print-player-name">{player ? player.name : ''}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        {bench.length > 0 && (
          <div className="print-bench">
            {bench.map(p => (
              <div key={p.id} className="print-slot">
                <span className="print-player-name">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PrintView({ game, players }) {
  if (!game) return null

  const sorted = [...game.configurations].sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half
    return a.minute - b.minute
  })

  const firstHalf = sorted.filter(c => c.half === 1)
  const secondHalf = sorted.filter(c => c.half === 2)

  return (
    <div className="print-view">
      <div className="print-page">
        <div className="print-title">{game.name} — 1st Half</div>
        <div className="print-configs-grid">
          {firstHalf.map((config, i) => (
            <PrintPitch key={config.id} config={config} prevConfig={firstHalf[i - 1]} players={players} benchOrder={config.benchOrder} />
          ))}
        </div>
      </div>

      <div className="print-page">
        <div className="print-title">{game.name} — 2nd Half</div>
        <div className="print-configs-grid">
          {secondHalf.map((config, i) => (
            <PrintPitch key={config.id} config={config} prevConfig={i === 0 ? firstHalf[firstHalf.length - 1] : secondHalf[i - 1]} players={players} benchOrder={config.benchOrder} />
          ))}
        </div>
      </div>
    </div>
  )
}
