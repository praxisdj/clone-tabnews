import {
  InternalServerError,
  MethodNotAllowedError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "infra/errors";
import * as cookie from "cookie";
import session from "models/session";
import authorization from "models/authorization";

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
    return response.status(error.statusCode).json(error);
  }

  if (error instanceof UnauthorizedError) {
    clearSessionCookie(response);
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error(publicErrorObject);

  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function setSessionCookie(sessionToken, response) {
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000, // Convert milliseconds to seconds
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    httpOnly: true, // Prevent client-side JavaScript from accessing the cookie (XSS protection)
  });

  response.setHeader("Set-Cookie", setCookie);
}

function clearSessionCookie(response) {
  const setCookie = cookie.serialize("session_id", "invalid", {
    path: "/",
    maxAge: -1,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    httpOnly: true, // Prevent client-side JavaScript from accessing the cookie (XSS protection)
  });

  response.setHeader("Set-Cookie", setCookie);
}

async function injectAnonymousOrUser(request, response, next) {
  if (request.cookies?.session_id) {
    await injectAuthenticatedUser(request);
  } else {
    injectAnonymousUser(request);
  }

  return next();
}

async function injectAuthenticatedUser(request) {
  const sessionToken = request.cookies.session_id;
  const sessionObject = await session.findOneValidByToken(sessionToken);
  const user = await user.findOneById(sessionObject.user_id);

  request.context = {
    ...request.context,
    user: user,
  }
}

function injectAnonymousUser(request) {
  const anonymousUser = {
    features: ["read:activation_token", "create:session", "create:user"],
  }

  request.context = {
    ...request.context,
    user: anonymousUser,
  }
}

function canRequest(feature) {
  return function canRequestMiddleware(request, response, next) {
    const userTryingToRequest = request.context.user;

    if (authorization.can(userTryingToRequest, feature)) {
      return next();
    }

    throw new ForbiddenError({
      message: "User does not have permission to request this resource",
      action: "Check your permissions and try again",
    });

  }
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
  setSessionCookie,
  clearSessionCookie,
  injectAnonymousOrUser,
  canRequest,
};

export default controller;
