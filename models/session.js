import database from "infra/database.js";
import { UnauthorizedError } from "infra/errors";
import crypto from "node:crypto";

const EXPIRATION_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30; // 30 days

async function create(userId) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
  const newSession = await runInsertQuery(token, userId, expiresAt);
  return newSession;

  async function runInsertQuery(token, userId, expiresAt) {
    const result = await database.query({
      text: `
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
      values: [token, userId, expiresAt],
    });

    if (result.rows.length === 0) {
      throw new Error("Failed to create session");
    }

    return result.rows[0];
  }
}

async function findOneValidByToken(sessionToken) {
  const sessionFound = await runSelectQuery(sessionToken);
  return sessionFound;

  async function runSelectQuery(sessionToken) {
    const results = await database.query({
      text: `
      SELECT * FROM sessions
      WHERE token = $1
      AND expires_at > NOW()
      LIMIT 1;
    `,
      values: [sessionToken],
    });

    if (results.rows.length === 0) {
      throw new UnauthorizedError({
        message: `Session not found or expired.`,
        action: `Please log in again.`,
      });
    }

    return results.rows[0];
  }

}

async function renew(sessionId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
  const renewedSession = await runUpdateQuery(sessionId, expiresAt);
  return renewedSession;

  async function runUpdateQuery(sessionId, expiresAt) {
    const results = await database.query({
      text: `
      UPDATE sessions
      SET expires_at = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `,
      values: [expiresAt, sessionId],
    });

    if (results.rows.length === 0) {
      throw new Error("Failed to renew session");
    }

    return results.rows[0];
  }
}

const session = {
  create,
  findOneValidByToken,
  renew,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;
