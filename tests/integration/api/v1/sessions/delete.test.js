import orchestrator from "tests/orchestrator.js";
import session from "models/session.js";
import setCookieParser from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  describe("Default user", () => {
    test("With nonexistent session", async () => {
      const invalidSession = `nonexistentSessionToken887979898897897`;
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        headers: {
          Cookie: `session_id=${invalidSession}`,
        },
        method: "DELETE",
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Session not found or expired.",
        action: "Please log in again.",
        status_code: 401,
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

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
        method: "DELETE",
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Session not found or expired.",
        action: "Please log in again.",
        status_code: 401,
      });
    });

    test("With valid session", async () => {
      const user = await orchestrator.createUser({
        username: "UserWithValidSession2",
      });

      await orchestrator.activateUser(user.id);

      const sessionObject = await orchestrator.createSession(user.id);

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
        method: "DELETE",
      });
      const sessionObjectResponse = await response.json();

      expect(response.status).toBe(200);
      expect(sessionObjectResponse).toEqual({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.user_id,
        expires_at: sessionObjectResponse.expires_at,
        created_at: sessionObjectResponse.created_at,
        updated_at: sessionObjectResponse.updated_at,
      });

      expect(
        sessionObjectResponse.expires_at <
        sessionObject.expires_at.toISOString(),
      ).toBe(true);
      expect(
        sessionObjectResponse.updated_at >
        sessionObject.updated_at.toISOString(),
      ).toBe(true);

      // Set cookies assertions
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

      // double check if user can't use the expired session anymore
      const secondResponse = await fetch("http://localhost:3000/api/v1/users", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      const secondResponseBody = await secondResponse.json();

      expect(secondResponse.status).toBe(401);
      expect(secondResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Session not found or expired.",
        action: "Please log in again.",
        status_code: 401,
      });
    });
  });
});
