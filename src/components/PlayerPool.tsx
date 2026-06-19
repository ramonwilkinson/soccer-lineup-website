import { useDraggable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { POSITIONS, POSITION_COLORS } from '../constants'
import type { Player } from '../types'

function PositionBadges({ player }: { player: Player }) {
  return (
    <div className="flex gap-0.5 ml-auto">
      {POSITIONS.filter(pos => player.positions.includes(pos)).map(pos => (
        <span key={pos} className={`px-1 py-0.5 text-[9px] font-bold text-white rounded ${POSITION_COLORS[pos]}`}>
          {pos}
        </span>
      ))}
    </div>
  )
}

function DraggablePlayer({ player, onContextMenu }: { player: Player; onContextMenu: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { player },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu() }}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing select-none bg-slate-700 hover:bg-slate-600 transition-colors"
    >
      <span className="text-xs text-white truncate flex-1">{player.name}</span>
      <PositionBadges player={player} />
    </div>
  )
}

function SortableBenchPlayer({ player, onContextMenu }: { player: Player; onContextMenu: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `bench-${player.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu() }}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing select-none bg-slate-700/30 hover:bg-slate-600/50 transition-colors"
    >
      <svg className="w-3 h-3 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="4" r="1.5" />
        <circle cx="11" cy="4" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="11" cy="12" r="1.5" />
      </svg>
      <span className="text-xs text-white truncate flex-1">{player.name}</span>
      <PositionBadges player={player} />
    </div>
  )
}

interface Props {
  players: Player[]
  assignments: Record<string, string>
  benchOrder?: string[]
  unavailablePlayers: string[]
  onToggleUnavailable: (playerId: string) => void
}

export default function PlayerPool({ players, assignments, benchOrder, unavailablePlayers, onToggleUnavailable }: Props) {
  const assignedPlayerIds = new Set(Object.values(assignments))
  const unavailableSet = new Set(unavailablePlayers)

  const available = players.filter(p => !unavailableSet.has(p.id))
  const unavailable = players.filter(p => unavailableSet.has(p.id))

  const benchUnsorted = available.filter(p => !assignedPlayerIds.has(p.id))
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

  const onPitch = available.filter(p => assignedPlayerIds.has(p.id))
  const sortableIds = bench.map(p => `bench-${p.id}`)

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-1.5">Bench ({bench.length})</h4>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {bench.map(player => (
              <SortableBenchPlayer
                key={player.id}
                player={player}
                onContextMenu={() => onToggleUnavailable(player.id)}
              />
            ))}
            {bench.length === 0 && (
              <p className="text-slate-500 text-[10px] text-center py-2">All assigned</p>
            )}
          </div>
        </SortableContext>
      </div>

      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-1.5">On Pitch ({onPitch.length})</h4>
        <div className="space-y-1">
          {onPitch.map(player => (
            <DraggablePlayer
              key={player.id}
              player={player}
              onContextMenu={() => onToggleUnavailable(player.id)}
            />
          ))}
        </div>
      </div>

      {unavailable.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-500 mb-1.5">Unavailable ({unavailable.length})</h4>
          <div className="space-y-1">
            {unavailable.map(player => (
              <div
                key={player.id}
                onContextMenu={(e) => { e.preventDefault(); onToggleUnavailable(player.id) }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg select-none bg-slate-800/40 opacity-50 cursor-default"
                title="Right-click to mark available"
              >
                <span className="text-xs text-slate-400 truncate flex-1 line-through">{player.name}</span>
                <PositionBadges player={player} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
