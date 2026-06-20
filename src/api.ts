import { CognitoUserPool } from 'amazon-cognito-identity-js'
import type { CognitoUserSession } from 'amazon-cognito-identity-js'

const API_URL = import.meta.env.VITE_API_URL as string | undefined

const userPool = new CognitoUserPool({
  UserPoolId: 'us-east-1_4GXRxmSyH',
  ClientId: 'o601usi767h2anstq03h9c0gu',
})

// Uses the SDK so expired tokens are refreshed automatically via the refresh token
function getToken(): Promise<string | null> {
  return new Promise(resolve => {
    const user = userPool.getCurrentUser()
    if (!user) return resolve(null)
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null)
      resolve(session.getIdToken().getJwtToken())
    })
  })
}

function isConfigured(): boolean {
  return !!API_URL
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()
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
