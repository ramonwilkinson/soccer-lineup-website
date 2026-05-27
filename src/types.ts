export type PositionType = 'GK' | 'DEF' | 'MID' | 'ATT'

export interface Player {
  id: string
  name: string
  positions: PositionType[]
}

export interface FormationPosition {
  id: string
  label: string
  row: number
  col: number
  type: PositionType
}

export interface Formation {
  positions: FormationPosition[]
}

export interface Configuration {
  id: string
  half: 1 | 2
  minute: number
  assignments: Record<string, string>
  benchOrder?: string[]
}

export interface Game {
  id: string
  name: string
  date?: string
  configurations: Configuration[]
}

export interface AppState {
  players: Player[]
  games: Game[]
}
