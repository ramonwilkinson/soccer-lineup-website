import { useDroppable } from '@dnd-kit/core'
import type { Formation, FormationPosition, Player } from '../types'

function isPlayerOutOfPosition(player: Player, positionType: string): boolean {
  return !player.positions.includes(positionType as Player['positions'][number])
}

interface SlotProps {
  position: FormationPosition
  player: Player | null | undefined
  isOutOfPosition: boolean
  onClear: (posId: string) => void
  compact?: boolean
}

function PositionSlot({ position, player, isOutOfPosition, onClear, compact }: SlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `position-${position.id}` })

  const size = compact ? 'w-14 h-14' : 'w-20 h-20'

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => player && onClear(position.id)}
      className={`relative ${size} rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all ${
        isOver
          ? 'border-emerald-400 bg-emerald-400/20 scale-110'
          : player
            ? 'border-solid border-slate-500 bg-slate-700 hover:border-red-400/50 cursor-pointer'
            : 'border-slate-500 bg-slate-800/50'
      }`}
      title={player ? 'Double-click to remove' : ''}
    >
      <span className={`text-slate-400 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>{position.label}</span>
      {player ? (
        <>
          <span className={`font-bold text-white truncate text-center leading-tight ${compact ? 'text-[9px] max-w-[48px]' : 'text-xs max-w-[70px]'}`}>
            {player.name}
          </span>
          {isOutOfPosition && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white" title="Out of position">
              !
            </span>
          )}
        </>
      ) : null}
    </div>
  )
}

interface Props {
  formation: Formation
  assignments: Record<string, string>
  players: Player[]
  onClearPosition: (posId: string) => void
  compact?: boolean
}

export default function PitchView({ formation, assignments, players, onClearPosition, compact }: Props) {
  const rows = [4, 3, 2, 1, 0]

  return (
    <div className={`relative bg-emerald-900/40 border border-emerald-700/50 rounded-2xl ${compact ? 'p-3 min-h-[300px]' : 'p-6 min-h-[500px]'}`}>
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-600/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-emerald-600/30 rounded-full" />
      </div>

      <div className={`relative flex flex-col items-center ${compact ? 'gap-3' : 'gap-6'}`}>
        {rows.map(row => {
          const positionsInRow = formation.positions.filter(p => p.row === row)
          if (positionsInRow.length === 0) return null
          return (
            <div key={row} className={`flex justify-center ${compact ? 'gap-4' : 'gap-8'}`}>
              {positionsInRow.map(pos => {
                const playerId = assignments[pos.id]
                const player = playerId ? players.find(p => p.id === playerId) : null
                const outOfPosition = player ? isPlayerOutOfPosition(player, pos.type) : false
                return (
                  <PositionSlot
                    key={pos.id}
                    position={pos}
                    player={player}
                    isOutOfPosition={outOfPosition}
                    onClear={onClearPosition}
                    compact={compact}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
