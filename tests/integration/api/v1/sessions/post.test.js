import orchestrator from "tests/orchestrator";
import session from "models/session";
import setCookieParser from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("With incorrect email but correct pass", async () => {
      await orchestrator.createUser({
        password: "correct-password",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "incorrect.email@email.com",
          password: "correct-password",
        }),
      });

      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Invalid email or password",
        action: "Check your credentials and try again",
        status_code: 401,
      });
    });

    test("With correct email but incorrect pass", async () => {
      await orchestrator.createUser({
        email: "correct@email.com",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "correct@email.com",
          password: "incorrect-password",
        }),
      });

      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Invalid email or password",
        action: "Check your credentials and try again",
        status_code: 401,
      });
    });

    test("With incorrect email and incorrect pass", async () => {
      await orchestrator.createUser({});

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "incorrect@email.com",
          password: "incorrect-password",
        }),
      });

      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Invalid email or password",
        action: "Check your credentials and try again",
        status_code: 401,
      });
    });

    test("With correct email and correct pass", async () => {
      const testUser = await orchestrator.createUser({
        email: "all-correct@email.com",
        password: "correct-password",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testUser.email,
          password: "correct-password",
        }),
      });

      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: testUser.id,
        created_at: responseBody.created_at,
        expires_at: responseBody.expires_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.token).toHaveLength(96);

      const expiresAt = new Date(responseBody.expires_at);
      const createdAt = new Date(responseBody.created_at);

      expiresAt.setMilliseconds(0);
      createdAt.setMilliseconds(0);
      expect(
        Math.abs(expiresAt - createdAt - session.EXPIRATION_IN_MILLISECONDS),
      ).toBeLessThanOrEqual(1000);

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: responseBody.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });
    });
  });
});
