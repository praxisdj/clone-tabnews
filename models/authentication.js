import user from "models/user";
import password from "models/password";
import { NotFoundError, UnauthorizedError } from "infra/errors";

async function getAuthenticatedUser(providedEmail, providedPassword) {
  try {
    const storedUser = await findUserByEmail(providedEmail);
    await validatePassword(providedPassword, storedUser.password);
    return storedUser;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Invalid email or password",
        action: "Check your credentials and try again",
      });
    }

    throw error;
  }

  async function findUserByEmail(email) {
    let userFound;
    try {
      userFound = await user.findOneByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError({
          message: "Invalid email",
          action: "Check your credentials and try again",
          cause: error,
        });
      }

      throw error;
    }

    return userFound;
  }

  async function validatePassword(providedPassword, storedPassword) {
    if (!storedPassword || !providedPassword) {
      throw new UnauthorizedError({
        message: "Password not provided",
        action: "Check your credentials and try again",
      });
    }

    const correctPassword = await password.compare(
      providedPassword,
      storedPassword,
    );

    console.log("Password validation result:", correctPassword);

    if (!correctPassword) {
      throw new UnauthorizedError({
        message: "Invalid password",
        action: "Check your credentials and try again",
      });
    }
  }
}

const authentication = {
  getAuthenticatedUser,
};

export default authentication;
