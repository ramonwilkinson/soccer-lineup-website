import { useState } from 'react'

export default function ConfigurationManager({
  game,
  addConfiguration,
  duplicateConfiguration,
  removeConfiguration,
  selectedConfigId,
  onSelectConfig,
}) {
  const [half, setHalf] = useState(1)
  const [minute, setMinute] = useState(0)

  const sorted = [...game.configurations].sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half
    return a.minute - b.minute
  })

  function handleAdd(e) {
    e.preventDefault()
    addConfiguration(game.id, { half: Number(half), minute: Number(minute) })
  }

  function handleDuplicateFromPrevious(e) {
    e.preventDefault()
    const lastConfig = sorted[sorted.length - 1]
    if (lastConfig) {
      duplicateConfiguration(game.id, lastConfig.id, { half: Number(half), minute: Number(minute) })
    } else {
      addConfiguration(game.id, { half: Number(half), minute: Number(minute) })
    }
  }

  return (
    <div className="space-y-3">
      <form className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Half</label>
          <select
            value={half}
            onChange={e => setHalf(e.target.value)}
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
            onChange={e => setMinute(e.target.value)}
            className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          New Config
        </button>
        {sorted.length > 0 && (
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
          <button
            key={config.id}
            onClick={() => onSelectConfig(config.id)}
            className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedConfigId === config.id
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            H{config.half} {config.minute}'
            <span
              onClick={e => { e.stopPropagation(); removeConfiguration(game.id, config.id) }}
              className="ml-2 text-red-300 hover:text-red-100"
            >
              x
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
