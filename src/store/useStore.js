import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'soccer-lineup-data'

const DEFAULT_FORMATION = {
  positions: [
    { id: 'gk', label: 'GK', row: 0, col: 1, type: 'GK' },
    { id: 'def-l', label: 'LB', row: 1, col: 0, type: 'DEF' },
    { id: 'def-c', label: 'FB', row: 1, col: 1, type: 'DEF' },
    { id: 'def-r', label: 'RB', row: 1, col: 2, type: 'DEF' },
    { id: 'mid-c', label: 'CDM', row: 2, col: 1, type: 'MID' },
    { id: 'att-l', label: 'LW', row: 3, col: 0, type: 'ATT' },
    { id: 'att-c', label: 'CAM', row: 3, col: 1, type: 'MID' },
    { id: 'att-r', label: 'RW', row: 3, col: 2, type: 'ATT' },
    { id: 'str', label: 'STR', row: 4, col: 1, type: 'ATT' },
  ],
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      data.players = data.players.map(p => ({
        ...p,
        positions: p.positions || (p.position ? [p.position] : ['DEF']),
      }))
      return data
    }
  } catch (e) { /* ignore */ }
  return { players: [], games: [] }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

let listeners = []
let state = loadData()

function getState() {
  return state
}

function setState(updater) {
  state = typeof updater === 'function' ? updater(state) : updater
  saveData(state)
  listeners.forEach(l => l())
}

function subscribe(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

export function useStore() {
  const data = useSyncExternalStore(subscribe, getState)

  const addPlayer = useCallback((player) => {
    setState(s => ({
      ...s,
      players: [...s.players, { id: crypto.randomUUID(), ...player }]
    }))
  }, [])

  const updatePlayer = useCallback((id, updates) => {
    setState(s => ({
      ...s,
      players: s.players.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  }, [])

  const removePlayer = useCallback((id) => {
    setState(s => ({
      ...s,
      players: s.players.filter(p => p.id !== id)
    }))
  }, [])

  const addGame = useCallback((game) => {
    setState(s => ({
      ...s,
      games: [...s.games, { id: crypto.randomUUID(), configurations: [], ...game }]
    }))
  }, [])

  const duplicateGame = useCallback((gameId) => {
    setState(s => {
      const source = s.games.find(g => g.id === gameId)
      if (!source) return s
      const newGame = {
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

  const updateGame = useCallback((id, updates) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === id ? { ...g, ...updates } : g)
    }))
  }, [])

  const removeGame = useCallback((id) => {
    setState(s => ({
      ...s,
      games: s.games.filter(g => g.id !== id)
    }))
  }, [])

  const addConfiguration = useCallback((gameId, config) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: [...g.configurations, { id: crypto.randomUUID(), assignments: {}, ...config }]
      } : g)
    }))
  }, [])

  const duplicateConfiguration = useCallback((gameId, sourceConfigId, newConfig) => {
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

  const updateConfiguration = useCallback((gameId, configId, updates) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.map(c => c.id === configId ? { ...c, ...updates } : c)
      } : g)
    }))
  }, [])

  const removeConfiguration = useCallback((gameId, configId) => {
    setState(s => ({
      ...s,
      games: s.games.map(g => g.id === gameId ? {
        ...g,
        configurations: g.configurations.filter(c => c.id !== configId)
      } : g)
    }))
  }, [])

  const assignPlayer = useCallback((gameId, configId, positionId, playerId) => {
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

  const unassignPlayer = useCallback((gameId, configId, positionId) => {
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

  const setBenchOrder = useCallback((gameId, configId, benchOrder) => {
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

  const importData = useCallback((json) => {
    const data = JSON.parse(json)
    data.players = (data.players || []).map(p => ({
      ...p,
      positions: p.positions || (p.position ? [p.position] : ['DEF']),
    }))
    data.games = data.games || []
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
    setBenchOrder,
    exportData,
    importData,
  }
}
