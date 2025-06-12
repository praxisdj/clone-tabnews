import database from "infra/database";
import password from "models/password";

import { ValidationError, NotFoundError } from "infra/errors";

async function create(userInputValues) {
  await validateUniqueEmail(userInputValues.email);
  await validateUniqueUsername(userInputValues.username);
  await hashPasswordInObject(userInputValues);
  const newUser = await runInsertQuery(userInputValues);
  return newUser;
}

async function update(username, userInputValues) {
  const currentUser = await findOneByUserName(username);

  if ("username" in userInputValues) {
    if (
      currentUser.username.toLowerCase() !==
      userInputValues.username.toLowerCase()
    ) {
      await validateUniqueUsername(userInputValues.username);
    }
  }

  if ("email" in userInputValues) {
    await validateUniqueEmail(userInputValues.email);
  }

  if ("password" in userInputValues) {
    await hashPasswordInObject(userInputValues);
  }

  const userWithNewValues = {
    ...currentUser,
    ...userInputValues,
  };

  const updatedUser = await runUpdateQuery(userWithNewValues);
  return updatedUser;
}

async function runUpdateQuery(userWithNewValues) {
  const dbResult = await database.query({
    text: `
      UPDATE users
      SET username = $1, email = $2, password = $3, updated_at = timezone('utc', NOW())
      WHERE id = $4
      RETURNING *;
    `,
    values: [
      userWithNewValues.username,
      userWithNewValues.email,
      userWithNewValues.password,
      userWithNewValues.id,
    ],
  });

  return dbResult.rows[0];
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

async function validateUniqueEmail(email) {
  const dbResult = await database.query({
    text: `SELECT email FROM users WHERE LOWER(email) = LOWER($1);`,
    values: [email],
  });

  if (dbResult.rowCount > 0) {
    throw new ValidationError({
      message: `Email "${email}" is already in use.`,
      action: `Try again with a different email.`,
    });
  }
}

async function validateUniqueUsername(username) {
  const dbResult = await database.query({
    text: `SELECT email FROM users WHERE LOWER(username) = LOWER($1);`,
    values: [username],
  });

  if (dbResult.rowCount > 0) {
    throw new ValidationError({
      message: `Username "${username}" is already in use.`,
      action: `Try again with a different username.`,
    });
  }
}

async function runInsertQuery(userInputValues) {
  const dbResult = await database.query({
    text: `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
    values: [
      userInputValues.username,
      userInputValues.email,
      userInputValues.password,
    ],
  });

  return dbResult.rows[0];
}

async function findOneByUserName(username) {
  async function runSelectQuery(username) {
    const dbResult = await database.query({
      text: `
      SELECT * FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1;
    `,
      values: [username],
    });

    if (dbResult.rowCount === 0) {
      throw new NotFoundError({
        name: "NotFoundError",
        message: "User not found.",
        action: "Try again with a different username.",
      });
    }

    return dbResult.rows[0];
  }

  const userFound = runSelectQuery(username);
  return userFound;
}

async function findOneByEmail(email) {
  async function runSelectQuery(email) {
    const dbResult = await database.query({
      text: `
      SELECT * FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `,
      values: [email],
    });

    if (dbResult.rowCount === 0) {
      throw new NotFoundError({
        name: "NotFoundError",
        message: "User not found.",
        action: "Try again with a different email.",
      });
    }

    return dbResult.rows[0];
  }

  const userFound = runSelectQuery(email);
  return userFound;
}

const user = {
  create,
  update,
  findOneByUserName,
  findOneByEmail,
};

export default user;
