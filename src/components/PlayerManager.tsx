import { useState } from 'react'
import { POSITIONS, POSITION_COLORS } from '../constants'
import type { Player, PositionType } from '../types'

interface Props {
  players: Player[]
  addPlayer: (player: Omit<Player, 'id'>) => void
  updatePlayer: (id: string, updates: Partial<Player>) => void
  removePlayer: (id: string) => void
}

export default function PlayerManager({ players, addPlayer, updatePlayer, removePlayer }: Props) {
  const [name, setName] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<PositionType[]>(['DEF'])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPositions, setEditPositions] = useState<PositionType[]>([])

  function togglePosition(pos: PositionType, current: PositionType[], setter: (p: PositionType[]) => void) {
    if (current.includes(pos)) {
      if (current.length > 1) setter(current.filter(p => p !== pos))
    } else {
      setter([...current, pos])
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addPlayer({ name: name.trim(), positions: selectedPositions })
    setName('')
  }

  function startEdit(player: Player) {
    setEditingId(player.id)
    setEditName(player.name)
    setEditPositions([...player.positions])
  }

  function saveEdit(id: string) {
    updatePlayer(id, { name: editName, positions: editPositions })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Player name"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Positions</label>
          <div className="flex gap-1">
            {POSITIONS.map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => togglePosition(pos, selectedPositions, setSelectedPositions)}
                className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                  selectedPositions.includes(pos)
                    ? `${POSITION_COLORS[pos]} text-white`
                    : 'bg-slate-600 text-slate-400'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          Add Player
        </button>
      </form>

      <div className="space-y-1">
        {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(player => (
          <div key={player.id} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg group">
            {editingId === player.id ? (
              <div className="flex-1 space-y-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  autoFocus
                />
                <div className="flex gap-1">
                  {POSITIONS.map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos, editPositions, setEditPositions)}
                      className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
                        editPositions.includes(pos)
                          ? `${POSITION_COLORS[pos]} text-white`
                          : 'bg-slate-600 text-slate-400'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(player.id)} className="text-emerald-400 hover:text-emerald-300 text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <span className="flex-1 text-white text-sm truncate">{player.name}</span>
                <div className="flex gap-0.5 ml-auto">
                  {POSITIONS.filter(pos => player.positions.includes(pos)).map(pos => (
                    <span key={pos} className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${POSITION_COLORS[pos]}`}>
                      {pos}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => startEdit(player)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white text-xs transition-opacity shrink-0"
                >
                  Edit
                </button>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity shrink-0"
                >
                  Del
                </button>
              </>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">No players added yet</p>
        )}
      </div>
    </div>
  )
}
