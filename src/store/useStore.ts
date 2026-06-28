import { useCallback, useSyncExternalStore } from 'react'
import type { AppState, Configuration, Game, Player, PositionType } from '../types'
import { api } from '../api'

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

function normalisePlayers(players: StoredPlayer[]): Player[] {
  return players.map(p => ({
    ...p,
    positions: p.positions || (p.position ? [p.position as PositionType] : ['DEF']),
  }))
}

function loadData(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { players: StoredPlayer[], games: Game[] }
      return { ...data, players: normalisePlayers(data.players) }
    }
  } catch { /* ignore */ }
  return { players: [], games: [] }
}

function saveLocal(data: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

let listeners: Array<() => void> = []
let state: AppState = loadData()

function getState(): AppState {
  return state
}

function setState(updater: AppState | ((s: AppState) => AppState)): void {
  state = typeof updater === 'function' ? updater(state) : updater
  saveLocal(state)
  listeners.forEach(l => l())
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener)
  return () => { listeners = listeners.filter(l => l !== listener) }
}

// Called once on app mount — syncs between API and localStorage
export async function initializeFromApi(): Promise<void> {
  if (!api.isConfigured()) return
  try {
    const data = await api.getData() as { players: StoredPlayer[], games: Game[] }
    const hasApiData = data.players.length > 0 || data.games.length > 0

    if (hasApiData) {
      // API is source of truth — use it
      setState({ ...data, players: normalisePlayers(data.players) })
    } else if (state.players.length > 0 || state.games.length > 0) {
      // API is empty but localStorage has data — migrate it up silently
      for (const player of state.players) api.putPlayer(player).catch(console.error)
      for (const game of state.games) {
        api.putGame(game).catch(console.error)
        for (const config of game.configurations) {
          api.putConfig(game.id, config).catch(console.error)
        }
      }
    }
  } catch (e) {
    console.warn('Could not sync with API, using local data', e)
  }
}

export function useStore() {
  const data = useSyncExternalStore(subscribe, getState)

  const addPlayer = useCallback((player: Omit<Player, 'id'>) => {
    const newPlayer: Player = { id: crypto.randomUUID(), ...player }
    setState(s => ({ ...s, players: [...s.players, newPlayer] }))
    api.putPlayer(newPlayer).catch(console.error)
  }, [])

  const updatePlayer = useCallback((id: string, updates: Partial<Player>) => {
    setState(s => ({ ...s, players: s.players.map(p => p.id === id ? { ...p, ...updates } : p) }))
    const updated = state.players.find(p => p.id === id)
    if (updated) api.putPlayer(updated).catch(console.error)
  }, [])

  const removePlayer = useCallback((id: string) => {
    setState(s => ({ ...s, players: s.players.filter(p => p.id !== id) }))
    api.deletePlayer(id).catch(console.error)
  }, [])

  const addGame = useCallback((game: Omit<Game, 'id' | 'configurations'>) => {
    const newGame: Game = { id: crypto.randomUUID(), configurations: [], ...game }
    setState(s => ({ ...s, games: [...s.games, newGame] }))
    api.putGame(newGame).catch(console.error)
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
      // Fire API calls after state update
      setTimeout(() => {
        api.putGame(newGame).catch(console.error)
        for (const config of newGame.configurations) {
          api.putConfig(newGame.id, config).catch(console.error)
        }
      }, 0)
      return { ...s, games: [...s.games, newGame] }
    })
  }, [])

  const updateGame = useCallback((id: string, updates: Partial<Game>) => {
    setState(s => ({ ...s, games: s.games.map(g => g.id === id ? { ...g, ...updates } : g) }))
    const updated = state.games.find(g => g.id === id)
    if (updated) api.putGame(updated).catch(console.error)
  }, [])

  const removeGame = useCallback((id: string) => {
    setState(s => ({ ...s, games: s.games.filter(g => g.id !== id) }))
    api.deleteGame(id).catch(console.error)
  }, [])

  const addConfiguration = useCallback((gameId: string, config: Omit<Configuration, 'id' | 'assignments'>) => {
    const newConfig: Configuration = { id: crypto.randomUUID(), assignments: {}, ...config }
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? { ...g, configurations: [...g.configurations, newConfig] } : g),
    }))
    api.putConfig(gameId, newConfig).catch(console.error)
  }, [])

  const duplicateConfiguration = useCallback((gameId: string, sourceConfigId: string, newConfig: Omit<Configuration, 'id' | 'assignments'>) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => {
        if (g.id !== gameId) return g
        const source = g.configurations.find(c => c.id === sourceConfigId)
        const created: Configuration = {
          id: crypto.randomUUID(),
          assignments: source ? { ...source.assignments } : {},
          ...newConfig,
        }
        setTimeout(() => api.putConfig(gameId, created).catch(console.error), 0)
        return { ...g, configurations: [...g.configurations, created] }
      }),
    }))
  }, [])

  const updateConfiguration = useCallback((gameId: string, configId: string, updates: Partial<Configuration>) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => c.id === configId ? { ...c, ...updates } : c),
      } : g),
    }))
    const config = state.games.find(g => g.id === gameId)?.configurations.find(c => c.id === configId)
    if (config) api.putConfig(gameId, config).catch(console.error)
  }, [])

  const removeConfiguration = useCallback((gameId: string, configId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.filter(c => c.id !== configId),
      } : g),
    }))
    api.deleteConfig(gameId, configId).catch(console.error)
  }, [])

  const assignPlayer = useCallback((gameId: string, configId: string, positionId: string, playerId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => {
          if (c.id !== configId) return c
          const assignments = { ...c.assignments }
          Object.keys(assignments).forEach(key => { if (assignments[key] === playerId) delete assignments[key] })
          if (playerId) assignments[positionId] = playerId
          else delete assignments[positionId]
          return { ...c, assignments }
        }),
      } : g),
    }))
    const config = state.games.find(g => g.id === gameId)?.configurations.find(c => c.id === configId)
    if (config) api.putConfig(gameId, config).catch(console.error)
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
        }),
      } : g),
    }))
    const config = state.games.find(g => g.id === gameId)?.configurations.find(c => c.id === configId)
    if (config) api.putConfig(gameId, config).catch(console.error)
  }, [])

  const movePlayer = useCallback((gameId: string, configId: string, fromPosId: string, toPosId: string) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => {
          if (c.id !== configId) return c
          const assignments = { ...c.assignments }
          const movingId = assignments[fromPosId]
          const targetId = assignments[toPosId]
          if (!movingId) return c
          if (targetId) {
            assignments[fromPosId] = targetId
            assignments[toPosId] = movingId
          } else {
            delete assignments[fromPosId]
            assignments[toPosId] = movingId
          }
          return { ...c, assignments }
        }),
      } : g),
    }))
    const config = state.games.find(g => g.id === gameId)?.configurations.find(c => c.id === configId)
    if (config) api.putConfig(gameId, config).catch(console.error)
  }, [])

  const setBenchOrder = useCallback((gameId: string, configId: string, benchOrder: string[]) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => c.id === configId ? { ...c, benchOrder } : c),
      } : g),
    }))
    const config = state.games.find(g => g.id === gameId)?.configurations.find(c => c.id === configId)
    if (config) api.putConfig(gameId, config).catch(console.error)
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
          const configurations = g.configurations.map(c => {
            const assignments = { ...c.assignments }
            Object.keys(assignments).forEach(key => { if (assignments[key] === playerId) delete assignments[key] })
            return { ...c, assignments }
          })
          return { ...g, unavailablePlayers: [...unavailable, playerId], configurations }
        }
      }),
    }))
    const game = state.games.find(g => g.id === gameId)
    if (game) {
      api.putGame(game).catch(console.error)
      for (const config of game.configurations) {
        api.putConfig(gameId, config).catch(console.error)
      }
    }
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
    const newState: AppState = {
      players: normalisePlayers(raw.players || []),
      games: raw.games || [],
    }
    setState(newState)
    // Sync everything to API
    for (const player of newState.players) api.putPlayer(player).catch(console.error)
    for (const game of newState.games) {
      api.putGame(game).catch(console.error)
      for (const config of game.configurations) {
        api.putConfig(game.id, config).catch(console.error)
      }
    }
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
    movePlayer,
    setBenchOrder,
    togglePlayerAvailability,
    exportData,
    importData,
  }
}
