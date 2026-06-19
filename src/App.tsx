import { useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { useStore } from './store/useStore'
import PlayerManager from './components/PlayerManager'
import GameManager from './components/GameManager'
import ConfigurationManager from './components/ConfigurationManager'
import PitchView from './components/PitchView'
import PlayerPool from './components/PlayerPool'
import PlayTimeSummary from './components/PlayTimeSummary'
import PrintView from './components/PrintView'

type Tab = 'lineup' | 'summary'

function App() {
  const store = useStore()
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('lineup')

  const selectedGame = store.games.find(g => g.id === selectedGameId)
  const selectedConfig = selectedGame?.configurations.find(c => c.id === selectedConfigId)

  const sortedConfigs = selectedGame
    ? [...selectedGame.configurations].sort((a, b) => {
        if (a.half !== b.half) return a.half - b.half
        return a.minute - b.minute
      })
    : []

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !selectedGameId || !selectedConfigId) return

    if (active.id.toString().startsWith('bench-') && over.id.toString().startsWith('bench-')) {
      const assignedPlayerIds = new Set(Object.values(selectedConfig!.assignments))
      const benchPlayers = store.players.filter(p => !assignedPlayerIds.has(p.id))
      const currentOrder = selectedConfig!.benchOrder
        ? [...benchPlayers].sort((a, b) => {
            const ai = selectedConfig!.benchOrder!.indexOf(a.id)
            const bi = selectedConfig!.benchOrder!.indexOf(b.id)
            if (ai === -1 && bi === -1) return 0
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
          }).map(p => p.id)
        : benchPlayers.map(p => p.id)

      const activeId = active.id.toString().replace('bench-', '')
      const overId = over.id.toString().replace('bench-', '')
      const oldIndex = currentOrder.indexOf(activeId)
      const newIndex = currentOrder.indexOf(overId)

      const newOrder = [...currentOrder]
      newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, activeId)

      store.setBenchOrder(selectedGameId, selectedConfigId, newOrder)
      return
    }

    if (!over.id.toString().startsWith('position-')) return
    const positionId = over.id.toString().replace('position-', '')

    let playerId: string
    if (active.id.toString().startsWith('bench-')) {
      playerId = active.id.toString().replace('bench-', '')
    } else if (active.id.toString().startsWith('player-')) {
      playerId = active.id.toString().replace('player-', '')
    } else {
      return
    }

    store.assignPlayer(selectedGameId, selectedConfigId, positionId, playerId)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-emerald-400">Soccer</span> Lineup Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">9-a-side | 3-1-3-1 Formation | 13 Players</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={store.exportData}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg transition-colors"
          >
            Export
          </button>
          <label className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg transition-colors cursor-pointer">
            Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                file.text().then(json => store.importData(json))
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </header>

      <div className="flex">
        <nav className="w-80 border-r border-slate-700 p-4 space-y-6 shrink-0 max-h-[calc(100vh-80px)] overflow-y-auto">
          <section>
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Players ({store.players.length}/13)</h2>
            <PlayerManager
              players={store.players}
              addPlayer={store.addPlayer}
              updatePlayer={store.updatePlayer}
              removePlayer={store.removePlayer}
            />
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Games</h2>
            <GameManager
              games={store.games}
              addGame={store.addGame}
              duplicateGame={store.duplicateGame}
              updateGame={store.updateGame}
              removeGame={store.removeGame}
              selectedGameId={selectedGameId}
              onSelectGame={(id) => {
                setSelectedGameId(id)
                setSelectedConfigId(null)
              }}
            />
          </section>
        </nav>

        <main className="flex-1 p-6 max-h-[calc(100vh-80px)] overflow-y-auto">
          {!selectedGame ? (
            <div className="flex items-center justify-center h-96 text-slate-500">
              <p>Select or create a game to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{selectedGame.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('lineup')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'lineup' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Lineup
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'summary' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Play Time
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    Print
                  </button>
                </div>
              </div>

              {activeTab === 'lineup' && (
                <>
                  <ConfigurationManager
                    game={selectedGame}
                    addConfiguration={store.addConfiguration}
                    duplicateConfiguration={store.duplicateConfiguration}
                    updateConfiguration={store.updateConfiguration}
                    removeConfiguration={store.removeConfiguration}
                    selectedConfigId={selectedConfigId}
                    onSelectConfig={setSelectedConfigId}
                  />

                  {selectedConfig && (
                    <DndContext onDragEnd={handleDragEnd}>
                      <div className="grid grid-cols-[1fr_180px] gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-emerald-400 mb-2">
                            Editing: H{selectedConfig.half} {selectedConfig.minute}' (drag players here)
                          </h3>
                          <PitchView
                            formation={store.formation}
                            assignments={selectedConfig.assignments}
                            players={store.players}
                            onClearPosition={(posId) => store.unassignPlayer(selectedGameId!, selectedConfigId!, posId)}
                          />
                        </div>
                        <PlayerPool
                          players={store.players}
                          assignments={selectedConfig.assignments}
                          benchOrder={selectedConfig.benchOrder}
                          unavailablePlayers={selectedGame.unavailablePlayers ?? []}
                          onToggleUnavailable={(pid) => store.togglePlayerAvailability(selectedGameId!, pid)}
                        />
                      </div>
                    </DndContext>
                  )}

                  {!selectedConfig && sortedConfigs.length === 0 && (
                    <div className="flex items-center justify-center h-64 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                      <p>Add a configuration to get started</p>
                    </div>
                  )}

                  {sortedConfigs.length > 0 && (
                    <div className="space-y-4 mt-8">
                      <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2">All Configurations</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sortedConfigs.map(config => {
                          const unavailableSet = new Set(selectedGame.unavailablePlayers ?? [])
                          const benchUnsorted = store.players.filter(p => !Object.values(config.assignments).includes(p.id) && !unavailableSet.has(p.id))
                          const bench = config.benchOrder
                            ? [...benchUnsorted].sort((a, b) => {
                                const ai = config.benchOrder!.indexOf(a.id)
                                const bi = config.benchOrder!.indexOf(b.id)
                                if (ai === -1 && bi === -1) return 0
                                if (ai === -1) return 1
                                if (bi === -1) return -1
                                return ai - bi
                              })
                            : benchUnsorted
                          return (
                            <div
                              key={config.id}
                              className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                                selectedConfigId === config.id
                                  ? 'border-emerald-500 bg-emerald-900/10'
                                  : 'border-slate-700 hover:border-slate-500'
                              }`}
                              onClick={() => setSelectedConfigId(config.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-white">H{config.half} {config.minute}'</span>
                                <span className="text-[10px] text-slate-400">
                                  {Object.keys(config.assignments).length}/9 on pitch
                                </span>
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <PitchView
                                    formation={store.formation}
                                    assignments={config.assignments}
                                    players={store.players}
                                    onClearPosition={() => {}}
                                    compact
                                  />
                                </div>
                                {bench.length > 0 && (
                                  <div className="flex flex-col gap-1.5 justify-center">
                                    {bench.map(p => (
                                      <div
                                        key={p.id}
                                        className="w-14 h-14 rounded-full border border-slate-600 bg-slate-800/50 flex items-center justify-center"
                                      >
                                        <span className="text-[9px] text-slate-400 text-center leading-tight truncate max-w-[48px]">{p.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'summary' && (
                <PlayTimeSummary game={selectedGame} players={store.players} />
              )}
            </div>
          )}
        </main>
      </div>
      <PrintView game={selectedGame} players={store.players} />
    </div>
  )
}

export default App
