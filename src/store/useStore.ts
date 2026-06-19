import { useCallback, useSyncExternalStore } from 'react'
import type { AppState, Configuration, Game, Player, PositionType } from '../types'

const STORAGE_KEY = 'soccer-lineup-data'

const DEFAULT_FORMATION = {
  positions: [
    { id: 'gk', label: 'GK', row: 0, col: 1, type: 'GK' as PositionType },
    { id: 'def-l', label: 'LB', row: 1, col: 0, type: 'DEF' as PositionType },
    { id: 'def-c', label: 'FB', row: 1, col: 1, type: 'DEF' as PositionType },
    { id: 'def-r', label: 'RB', row: 1, col: 2, type: 'DEF' as PositionType },
    { id: 'mid-c', label: 'CDM', row: 2, col: 1, type: 'MID' as PositionType },
    { id: 'att-l', label: 'LW', row: 3, col: 0, type: 'ATT' as PositionType },
    { id: 'att-c', label: 'CAM', row: 3, col: 1, type: 'MID' as PositionType },
    { id: 'att-r', label: 'RW', row: 3, col: 2, type: 'ATT' as PositionType },
    { id: 'str', label: 'STR', row: 4, col: 1, type: 'ATT' as PositionType },
  ],
}

type StoredPlayer = Omit<Player, 'positions'> & { positions?: PositionType[], position?: string }

function loadData(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { players: StoredPlayer[], games: Game[] }
      data.players = data.players.map(p => ({
        ...p,
        positions: p.positions || (p.position ? [p.position as PositionType] : ['DEF']),
      }))
      return data as AppState
    }
  } catch { /* ignore */ }
  return { players: [], games: [] }
}

function saveData(data: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

let listeners: Array<() => void> = []
let state: AppState = loadData()

function getState(): AppState {
  return state
}

function setState(updater: AppState | ((s: AppState) => AppState)): void {
  state = typeof updater === 'function' ? updater(state) : updater
  saveData(state)
  listeners.forEach(l => l())
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

export function useStore() {
  const data = useSyncExternalStore(subscribe, getState)

  const addPlayer = useCallback((player: Omit<Player, 'id'>) => {
    setState(s => ({
      ...s,
      players: [...s.players, { id: crypto.randomUUID(), ...player }]
    }))
  }, [])

  const updatePlayer = useCallback((id: string, updates: Partial<Player>) => {
    setState(s => ({
      ...s,
      players: s.players.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  }, [])

  const removePlayer = useCallback((id: string) => {
    setState(s => ({
      ...s,
      players: s.players.filter(p => p.id !== id)
    }))
  }, [])

  const addGame = useCallback((game: Omit<Game, 'id' | 'configurations'>) => {
    setState(s => ({
      ...s,
      games: [...s.games, { id: crypto.randomUUID(), configurations: [], ...game }]
    }))
  }, [])

  const duplicateGame = useCallback((gameId: string) => {
    setState(s => {
      const source = s.games.find(g => g.id === gameId)
      if (!source) return s
      const newGame: Game = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copy)`,
        configurations: source.configurations.map(c => ({
          ...c,
          id: crypto.randomUUID(),
          assignments: { ...c.assignments },
          benchOrder: c.benchOrder ? [...c.benchOrder] : undefined,
        })),
      }
      return { ...s, games: [...s.games, newGame] }
    })
  }, [])

  const updateGame = useCallback((id: string, updates: Partial<Game>) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === id ? { ...g, ...updates } : g)
    }))
  }, [])

  const removeGame = useCallback((id: string) => {
    setState(s => ({
      ...s,
      games: s.games.filter(g => g.id !== id)
    }))
  }, [])

  const addConfiguration = useCallback((gameId: string, config: Omit<Configuration, 'id' | 'assignments'>) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: [...g.configurations, { id: crypto.randomUUID(), assignments: {}, ...config }]
      } : g)
    }))
  }, [])

  const duplicateConfiguration = useCallback((gameId: string, sourceConfigId: string, newConfig: Omit<Configuration, 'id' | 'assignments'>) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => {
        if (g.id !== gameId) return g
        const source = g.configurations.find(c => c.id === sourceConfigId)
        return {
          ...g,
          configurations: [...g.configurations, {
            id: crypto.randomUUID(),
            assignments: source ? { ...source.assignments } : {},
            ...newConfig,
          }]
        }
      })
    }))
  }, [])

  const updateConfiguration = useCallback((gameId: string, configId: string, updates: Partial<Configuration>) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => c.id === configId ? { ...c, ...updates } : c)
      } : g)
    }))
  }, [])

  const removeConfiguration = useCallback((gameId: string, configId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.filter(c => c.id !== configId)
      } : g)
    }))
  }, [])

  const assignPlayer = useCallback((gameId: string, configId: string, positionId: string, playerId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => {
          if (c.id !== configId) return c
          const assignments = { ...c.assignments }
          Object.keys(assignments).forEach(key => {
            if (assignments[key] === playerId) delete assignments[key]
          })
          if (playerId) {
            assignments[positionId] = playerId
          } else {
            delete assignments[positionId]
          }
          return { ...c, assignments }
        })
      } : g)
    }))
  }, [])

  const unassignPlayer = useCallback((gameId: string, configId: string, positionId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => {
          if (c.id !== configId) return c
          const assignments = { ...c.assignments }
          delete assignments[positionId]
          return { ...c, assignments }
        })
      } : g)
    }))
  }, [])

  const togglePlayerAvailability = useCallback((gameId: string, playerId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => {
        if (g.id !== gameId) return g
        const unavailable = g.unavailablePlayers ?? []
        const isUnavailable = unavailable.includes(playerId)
        if (isUnavailable) {
          return { ...g, unavailablePlayers: unavailable.filter(id => id !== playerId) }
        } else {
          // Remove from all config assignments when marking unavailable
          const configurations = g.configurations.map(c => {
            const assignments = { ...c.assignments }
            Object.keys(assignments).forEach(key => {
              if (assignments[key] === playerId) delete assignments[key]
            })
            return { ...c, assignments }
          })
          return { ...g, unavailablePlayers: [...unavailable, playerId], configurations }
        }
      })
    }))
  }, [])

  const setBenchOrder = useCallback((gameId: string, configId: string, benchOrder: string[]) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c =>
          c.id === configId ? { ...c, benchOrder } : c
        )
      } : g)
    }))
  }, [])

  const exportData = useCallback(() => {
    const json = JSON.stringify(getState(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'soccer-lineup-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importData = useCallback((json: string) => {
    const raw = JSON.parse(json) as { players?: StoredPlayer[], games?: Game[] }
    const data: AppState = {
      players: (raw.players || []).map(p => ({
        ...p,
        positions: p.positions || (p.position ? [p.position as PositionType] : ['DEF']),
      })),
      games: raw.games || [],
    }
    setState(data)
  }, [])

  return {
    ...data,
    formation: DEFAULT_FORMATION,
    addPlayer,
    updatePlayer,
    removePlayer,
    addGame,
    duplicateGame,
    updateGame,
    removeGame,
    addConfiguration,
    duplicateConfiguration,
    updateConfiguration,
    removeConfiguration,
    assignPlayer,
    unassignPlayer,
    togglePlayerAvailability,
    setBenchOrder,
    exportData,
    importData,
  }
}
