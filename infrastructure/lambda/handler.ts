import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE = process.env.TABLE_NAME!

function ok(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function err(status: number, message: string): APIGatewayProxyResultV2 {
  return { statusCode: status, body: JSON.stringify({ error: message }) }
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = event.requestContext.authorizer.jwt.claims['sub'] as string
  const method = event.requestContext.http.method
  const path = event.requestContext.http.path
  const p = event.pathParameters ?? {}
  const pk = `USER#${userId}`

  try {
    // GET /data — reconstruct full AppState from all user rows
    if (method === 'GET' && path === '/data') {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pk },
      }))

      const players: Record<string, unknown>[] = []
      const gamesMap = new Map<string, Record<string, unknown>>()
      const configsByGame = new Map<string, Record<string, unknown>[]>()

      for (const item of result.Items ?? []) {
        const { pk: _pk, sk: _sk, ...data } = item as Record<string, unknown>
        const sk = item.sk as string

        if (sk.startsWith('PLAYER#')) {
          players.push({ id: sk.replace('PLAYER#', ''), ...data })
        } else if (sk.startsWith('GAME#') && !sk.includes('#CONFIG#')) {
          const gameId = sk.replace('GAME#', '')
          gamesMap.set(gameId, { id: gameId, configurations: [], ...data })
        } else if (sk.includes('#CONFIG#')) {
          const [gamePart, configId] = sk.split('#CONFIG#')
          const gameId = gamePart.replace('GAME#', '')
          if (!configsByGame.has(gameId)) configsByGame.set(gameId, [])
          configsByGame.get(gameId)!.push({ id: configId, ...data })
        }
      }

      for (const [gameId, configs] of configsByGame) {
        const game = gamesMap.get(gameId)
        if (game) (game.configurations as unknown[]).push(...configs)
      }

      return ok({ players, games: Array.from(gamesMap.values()) })
    }

    // PUT /players/:playerId
    if (method === 'PUT' && p.playerId && !p.gameId) {
      const body = JSON.parse(event.body ?? '{}')
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: { pk, sk: `PLAYER#${p.playerId}`, ...body },
      }))
      return ok({ ok: true })
    }

    // DELETE /players/:playerId
    if (method === 'DELETE' && p.playerId && !p.gameId) {
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key: { pk, sk: `PLAYER#${p.playerId}` },
      }))
      return ok({ ok: true })
    }

    // PUT /games/:gameId
    if (method === 'PUT' && p.gameId && !p.configId) {
      const body = JSON.parse(event.body ?? '{}')
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: { pk, sk: `GAME#${p.gameId}`, ...body },
      }))
      return ok({ ok: true })
    }

    // DELETE /games/:gameId — cascade delete all configs
    if (method === 'DELETE' && p.gameId && !p.configId) {
      const configs = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': `GAME#${p.gameId}#CONFIG#` },
      }))

      const deletes = [
        { DeleteRequest: { Key: { pk, sk: `GAME#${p.gameId}` } } },
        ...(configs.Items ?? []).map(item => ({ DeleteRequest: { Key: { pk, sk: item.sk } } })),
      ]

      for (let i = 0; i < deletes.length; i += 25) {
        await ddb.send(new BatchWriteCommand({
          RequestItems: { [TABLE]: deletes.slice(i, i + 25) },
        }))
      }
      return ok({ ok: true })
    }

    // PUT /games/:gameId/configs/:configId
    if (method === 'PUT' && p.gameId && p.configId) {
      const body = JSON.parse(event.body ?? '{}')
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: { pk, sk: `GAME#${p.gameId}#CONFIG#${p.configId}`, ...body },
      }))
      return ok({ ok: true })
    }

    // DELETE /games/:gameId/configs/:configId
    if (method === 'DELETE' && p.gameId && p.configId) {
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key: { pk, sk: `GAME#${p.gameId}#CONFIG#${p.configId}` },
      }))
      return ok({ ok: true })
    }

    return err(404, 'Not found')
  } catch (e) {
    console.error(e)
    return err(500, 'Internal server error')
  }
}
