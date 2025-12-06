import orchestrator from "tests/orchestrator.js";
import session from "models/session.js";
import setCookieParser from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Default user", () => {
    test("With valid session", async () => {
      const user = await orchestrator.createUser({
        username: "UserWithValidSession",
      });

      const sessionObject = await orchestrator.createSession(user.id);

      const response = await fetch("http://localhost:3000/api/v1/users", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      const responseBody = await response.json();

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBe(
        "no-store, no-cache, max-age=0, must-revalidate",
      );

      expect(response.status).toBe(200);
      expect(responseBody).toEqual({
        id: user.id,
        username: user.username,
        email: user.email,
        features: [],
        password: user.password,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      });

      const renewedSessionObject = await session.findOneValidByToken(
        sessionObject.token,
      );

      expect(renewedSessionObject.expires_at > sessionObject.expires_at).toBe(
        true,
      );
      expect(renewedSessionObject.updated_at > sessionObject.updated_at).toBe(
        true,
      );

      // Set cookies assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: sessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });
    });

    test("With nonexistent session", async () => {
      await orchestrator.createUser({
        username: "UserWithNoSession",
      });

      const response = await fetch("http://localhost:3000/api/v1/users", {
        headers: {
          Cookie: `session_id=nonexistentSessionToken`,
        },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Session not found or expired.",
        action: "Please log in again.",
        status_code: 401,
      });

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const user = await orchestrator.createUser({
        username: "UserWithExpiredSession",
      });

      const sessionObject = await orchestrator.createSession(user.id);

      jest.useRealTimers();

      const response = await fetch("http://localhost:3000/api/v1/users", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Session not found or expired.",
        action: "Please log in again.",
        status_code: 401,
      });

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
    });
  });

  describe("Anonymous user", () => {
    test("With exact case match", async () => {
      await orchestrator.createUser({
        username: "SameCase",
        email: "same.case@email.com",
        password: "password123",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/SameCase",
      );
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "SameCase",
        email: "same.case@email.com",
        features: [],
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("With case mismatch", async () => {
      await orchestrator.createUser({
        username: "OtherCase",
        email: "other.case@email.com",
        password: "password123",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/othercase",
      );
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "OtherCase",
        email: "other.case@email.com",
        features: [],
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("Not found", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/unexistentUser",
      );
      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "User not found.",
        action: "Try again with a different username.",
        status_code: 404,
      });
    });
  });
});
