const API_URL = import.meta.env.VITE_API_URL as string | undefined
const COGNITO_CLIENT_ID = 'o601usi767h2anstq03h9c0gu'

function getToken(): string | null {
  const lastUser = localStorage.getItem(
    `CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}.LastAuthUser`
  )
  if (!lastUser) return null
  return localStorage.getItem(
    `CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}.${lastUser}.idToken`
  )
}

function isConfigured(): boolean {
  return !!API_URL && !!getToken()
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...options.headers,
    },
  })
}

export const api = {
  isConfigured,

  async getData() {
    const res = await apiFetch('/data')
    if (!res.ok) throw new Error(`GET /data failed: ${res.status}`)
    return res.json()
  },

  async putPlayer(player: object) {
    const res = await apiFetch(`/players/${(player as { id: string }).id}`, {
      method: 'PUT',
      body: JSON.stringify(player),
    })
    if (!res.ok) throw new Error(`PUT /players failed: ${res.status}`)
  },

  async deletePlayer(id: string) {
    const res = await apiFetch(`/players/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE /players failed: ${res.status}`)
  },

  async putGame(game: { id: string; [key: string]: unknown }) {
    // Store only game metadata — configs are stored separately
    const { configurations: _, ...meta } = game
    const res = await apiFetch(`/games/${game.id}`, {
      method: 'PUT',
      body: JSON.stringify(meta),
    })
    if (!res.ok) throw new Error(`PUT /games failed: ${res.status}`)
  },

  async deleteGame(id: string) {
    const res = await apiFetch(`/games/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE /games failed: ${res.status}`)
  },

  async putConfig(gameId: string, config: object) {
    const id = (config as { id: string }).id
    const res = await apiFetch(`/games/${gameId}/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    })
    if (!res.ok) throw new Error(`PUT /configs failed: ${res.status}`)
  },

  async deleteConfig(gameId: string, configId: string) {
    const res = await apiFetch(`/games/${gameId}/configs/${configId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE /configs failed: ${res.status}`)
  },
}
