import type { PositionType } from './types'

export const POSITIONS: PositionType[] = ['GK', 'DEF', 'MID', 'ATT']

export const POSITION_COLORS: Record<PositionType, string> = {
  GK: 'bg-amber-500',
  DEF: 'bg-red-500',
  MID: 'bg-blue-500',
  ATT: 'bg-green-500',
}
