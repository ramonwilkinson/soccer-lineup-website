import { useState } from 'react'
import type { Game } from '../types'

interface Props {
  games: Game[]
  addGame: (game: Omit<Game, 'id' | 'configurations'>) => void
  duplicateGame: (gameId: string) => void
  updateGame: (id: string, updates: Partial<Game>) => void
  removeGame: (id: string) => void
  selectedGameId: string | null
  onSelectGame: (id: string) => void
}

export default function GameManager({ games, addGame, duplicateGame, updateGame, removeGame, selectedGameId, onSelectGame }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addGame({ name: name.trim(), date })
    setName('')
    setDate('')
  }

  function startEdit(e: React.MouseEvent, game: Game) {
    e.stopPropagation()
    setEditingId(game.id)
    setEditName(game.name)
    setEditDate(game.date || '')
  }

  function saveEdit(e: React.MouseEvent) {
    e.stopPropagation()
    if (!editingId) return
    updateGame(editingId, { name: editName, date: editDate })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-1">Game Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. vs. Eagles FC"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          Add Game
        </button>
      </form>

      <div className="space-y-1">
        {[...games].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(game => (
          <div
            key={game.id}
            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
              selectedGameId === game.id
                ? 'bg-emerald-600/20 border border-emerald-500/50'
                : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
            }`}
            onClick={() => onSelectGame(game.id)}
          >
            {editingId === game.id ? (
              <div className="flex-1 space-y-1" onClick={e => e.stopPropagation()}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  autoFocus
                />
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 text-sm">Save</button>
                  <button onClick={e => { e.stopPropagation(); setEditingId(null) }} className="text-slate-400 hover:text-slate-300 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{game.name}</div>
                  {game.date && <div className="text-slate-400 text-xs">{game.date}</div>}
                  <div className="text-slate-400 text-xs">{game.configurations.length} configs</div>
                </div>
                <button
                  onClick={e => startEdit(e, game)}
                  className="text-slate-400 hover:text-slate-300 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={e => { e.stopPropagation(); duplicateGame(game.id) }}
                  className="text-slate-400 hover:text-slate-300 text-sm"
                >
                  Copy
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeGame(game.id) }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
        {games.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">No games created yet</p>
        )}
      </div>
    </div>
  )
}
