import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import user from "models/user";
import password from "models/password";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("With unique and valid data", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "dj",
          email: "dj@email.com",
          password: "password123",
        }),
      });
      expect(response.status).toBe(201);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "dj",
        email: "dj@email.com",
        features: [],
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const userInDb = await user.findOneByUserName("dj");
      const correctPasswordMatch = await password.compare(
        "password123",
        userInDb.password,
      );
      const incorrectPasswordMatch = await password.compare(
        "wrongpassword",
        userInDb.password,
      );
      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });

    test("With duplicated `email`", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "duplicate1",
          email: "duplicate@email.com",
          password: "password123",
        }),
      });
      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "duplicate2",
          email: "Duplicate@email.com",
          password: "password123",
        }),
      });
      expect(response2.status).toBe(400);

      const responseBody = await response2.json();
      expect(responseBody).toEqual({
        message: `Email "Duplicate@email.com" is already in use.`,
        action: `Try again with a different email.`,
        name: "ValidationError",
        status_code: 400,
      });
    });

    test("With duplicated `username`", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "duplicated",
          email: "duplicated.user.1@email.com",
          password: "password123",
        }),
      });
      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "duplicated",
          email: "duplicated.user.2@email.com",
          password: "password123",
        }),
      });
      expect(response2.status).toBe(400);

      const responseBody = await response2.json();
      expect(responseBody).toEqual({
        message: `Username "duplicated" is already in use.`,
        action: `Try again with a different username.`,
        name: "ValidationError",
        status_code: 400,
      });
    });
  });
});
