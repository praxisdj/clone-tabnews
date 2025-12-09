import email from "infra/email";
import { NotFoundError } from "infra/errors";
import database from "infra/database";
import webserver from "infra/webserver";

const MINUTES_TO_EXPIRE = 15;
const EXPIRATION_IN_MILLISECONDS = MINUTES_TO_EXPIRE * 60 * 1000;

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "DJ <email@djonathan.com>",
    to: `<${user.email}>`,
    subject: "Activate your account",
    text: `${user.username}, click the link below to activate your account: ${webserver.origin}/user/activate/${activationToken.id}`,
  });
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const result = await database.query({
      text: `
      INSERT INTO user_activation_tokens (user_id, expires_at)
      VALUES ($1, $2)
      RETURNING *;
    `,
      values: [userId, expiresAt],
    });

    return result.rows[0];
  }
}

async function findOneValidById(token) {
  const result = await database.query({
    text: `
      SELECT * FROM user_activation_tokens
      WHERE id = $1
      AND expires_at > NOW()
      AND used_at IS NULL
      LIMIT 1;`,
    values: [token],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      name: "NotFoundError",
      message: "Activation token not found or expired.",
      action: "Try again with a different token.",
    });
  }

  return result.rows[0];
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
};

export default activation;
