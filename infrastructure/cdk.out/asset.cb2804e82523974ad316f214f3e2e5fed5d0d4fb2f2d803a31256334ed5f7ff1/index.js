"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambda/handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var TABLE = process.env.TABLE_NAME;
function ok(body) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
function err(status, message) {
  return { statusCode: status, body: JSON.stringify({ error: message }) };
}
async function handler(event) {
  const userId = event.requestContext.authorizer.jwt.claims["sub"];
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const p = event.pathParameters ?? {};
  const pk = `USER#${userId}`;
  try {
    if (method === "GET" && path === "/data") {
      const result = await ddb.send(new import_lib_dynamodb.QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk }
      }));
      const players = [];
      const gamesMap = /* @__PURE__ */ new Map();
      const configsByGame = /* @__PURE__ */ new Map();
      for (const item of result.Items ?? []) {
        const { pk: _pk, sk: _sk, ...data } = item;
        const sk = item.sk;
        if (sk.startsWith("PLAYER#")) {
          players.push({ id: sk.replace("PLAYER#", ""), ...data });
        } else if (sk.startsWith("GAME#") && !sk.includes("#CONFIG#")) {
          const gameId = sk.replace("GAME#", "");
          gamesMap.set(gameId, { id: gameId, configurations: [], ...data });
        } else if (sk.includes("#CONFIG#")) {
          const [gamePart, configId] = sk.split("#CONFIG#");
          const gameId = gamePart.replace("GAME#", "");
          if (!configsByGame.has(gameId)) configsByGame.set(gameId, []);
          configsByGame.get(gameId).push({ id: configId, ...data });
        }
      }
      for (const [gameId, configs] of configsByGame) {
        const game = gamesMap.get(gameId);
        if (game) game.configurations.push(...configs);
      }
      return ok({ players, games: Array.from(gamesMap.values()) });
    }
    if (method === "PUT" && p.playerId && !p.gameId) {
      const body = JSON.parse(event.body ?? "{}");
      await ddb.send(new import_lib_dynamodb.PutCommand({
        TableName: TABLE,
        Item: { pk, sk: `PLAYER#${p.playerId}`, ...body }
      }));
      return ok({ ok: true });
    }
    if (method === "DELETE" && p.playerId && !p.gameId) {
      await ddb.send(new import_lib_dynamodb.DeleteCommand({
        TableName: TABLE,
        Key: { pk, sk: `PLAYER#${p.playerId}` }
      }));
      return ok({ ok: true });
    }
    if (method === "PUT" && p.gameId && !p.configId) {
      const body = JSON.parse(event.body ?? "{}");
      await ddb.send(new import_lib_dynamodb.PutCommand({
        TableName: TABLE,
        Item: { pk, sk: `GAME#${p.gameId}`, ...body }
      }));
      return ok({ ok: true });
    }
    if (method === "DELETE" && p.gameId && !p.configId) {
      const configs = await ddb.send(new import_lib_dynamodb.QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: { ":pk": pk, ":prefix": `GAME#${p.gameId}#CONFIG#` }
      }));
      const deletes = [
        { DeleteRequest: { Key: { pk, sk: `GAME#${p.gameId}` } } },
        ...(configs.Items ?? []).map((item) => ({ DeleteRequest: { Key: { pk, sk: item.sk } } }))
      ];
      for (let i = 0; i < deletes.length; i += 25) {
        await ddb.send(new import_lib_dynamodb.BatchWriteCommand({
          RequestItems: { [TABLE]: deletes.slice(i, i + 25) }
        }));
      }
      return ok({ ok: true });
    }
    if (method === "PUT" && p.gameId && p.configId) {
      const body = JSON.parse(event.body ?? "{}");
      await ddb.send(new import_lib_dynamodb.PutCommand({
        TableName: TABLE,
        Item: { pk, sk: `GAME#${p.gameId}#CONFIG#${p.configId}`, ...body }
      }));
      return ok({ ok: true });
    }
    if (method === "DELETE" && p.gameId && p.configId) {
      await ddb.send(new import_lib_dynamodb.DeleteCommand({
        TableName: TABLE,
        Key: { pk, sk: `GAME#${p.gameId}#CONFIG#${p.configId}` }
      }));
      return ok({ ok: true });
    }
    return err(404, "Not found");
  } catch (e) {
    console.error(e);
    return err(500, "Internal server error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
