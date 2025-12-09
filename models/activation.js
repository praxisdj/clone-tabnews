import email from "infra/email";
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

async function findOneByUserId(userId) {
  const result = await database.query({
    text: `
    SELECT * FROM user_activation_tokens
    WHERE user_id = $1
  `,
    values: [userId],
  });

  return result.rows[0];
}

const activation = {
  findOneByUserId,
  sendEmailToUser,
  create,
};

export default activation;
