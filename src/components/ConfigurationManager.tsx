import { useState } from 'react'
import type { Configuration, Game } from '../types'

interface Props {
  game: Game
  addConfiguration: (gameId: string, config: Omit<Configuration, 'id' | 'assignments'>) => void
  duplicateConfiguration: (gameId: string, sourceConfigId: string, newConfig: Omit<Configuration, 'id' | 'assignments'>) => void
  updateConfiguration: (gameId: string, configId: string, updates: Partial<Configuration>) => void
  removeConfiguration: (gameId: string, configId: string) => void
  selectedConfigId: string | null
  onSelectConfig: (id: string) => void
}

export default function ConfigurationManager({
  game,
  addConfiguration,
  duplicateConfiguration,
  updateConfiguration,
  removeConfiguration,
  selectedConfigId,
  onSelectConfig,
}: Props) {
  const [half, setHalf] = useState<1 | 2>(1)
  const [minute, setMinute] = useState(0)
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [editHalf, setEditHalf] = useState<1 | 2>(1)
  const [editMinute, setEditMinute] = useState(0)

  const sorted = [...game.configurations].sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half
    return a.minute - b.minute
  })

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    addConfiguration(game.id, { half, minute })
  }

  function handleDuplicateFromPrevious(e: React.MouseEvent) {
    e.preventDefault()
    const halfConfigs = sorted.filter(c => c.half === half)
    const lastConfig = halfConfigs[halfConfigs.length - 1]
    if (lastConfig) {
      duplicateConfiguration(game.id, lastConfig.id, { half, minute })
    } else {
      addConfiguration(game.id, { half, minute })
    }
  }

  function startEdit(config: Configuration) {
    setEditingConfigId(config.id)
    setEditHalf(config.half)
    setEditMinute(config.minute)
  }

  function saveEdit() {
    if (!editingConfigId) return
    updateConfiguration(game.id, editingConfigId, { half: editHalf, minute: editMinute })
    setEditingConfigId(null)
  }

  return (
    <div className="space-y-3">
      <form className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Half</label>
          <select
            value={half}
            onChange={e => setHalf(Number(e.target.value) as 1 | 2)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={1}>1st Half</option>
            <option value={2}>2nd Half</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Minute</label>
          <input
            type="number"
            min={0}
            max={29}
            value={minute}
            onChange={e => setMinute(Number(e.target.value))}
            className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          New Config
        </button>
        {sorted.some(c => c.half === half) && (
          <button
            onClick={handleDuplicateFromPrevious}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
          >
            Copy from Last
          </button>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {sorted.map(config => (
          <div key={config.id} className="relative">
            {editingConfigId === config.id ? (
              <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-700 border border-emerald-500 rounded-lg">
                <select
                  value={editHalf}
                  onChange={e => setEditHalf(Number(e.target.value) as 1 | 2)}
                  className="bg-slate-600 text-white text-xs rounded px-1 py-0.5 focus:outline-none"
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={29}
                  value={editMinute}
                  onChange={e => setEditMinute(Number(e.target.value))}
                  className="w-10 bg-slate-600 text-white text-xs rounded px-1 py-0.5 focus:outline-none text-center"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingConfigId(null) }}
                />
                <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 text-xs font-medium">✓</button>
                <button onClick={() => setEditingConfigId(null)} className="text-slate-400 hover:text-slate-300 text-xs">✕</button>
              </div>
            ) : (
              <button
                onClick={() => onSelectConfig(config.id)}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedConfigId === config.id
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                H{config.half} {config.minute}'
                <span
                  onClick={e => { e.stopPropagation(); startEdit(config) }}
                  className="ml-1.5 text-slate-400 hover:text-white opacity-60 hover:opacity-100"
                  title="Edit time"
                >
                  ✎
                </span>
                <span
                  onClick={e => { e.stopPropagation(); removeConfiguration(game.id, config.id) }}
                  className="ml-1 text-red-300 hover:text-red-100"
                >
                  ×
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
