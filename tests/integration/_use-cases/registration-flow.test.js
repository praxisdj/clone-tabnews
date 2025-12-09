import orchestrator from "tests/orchestrator.js";
import activation from "models/activation.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use Case: Registration Flow - Success", () => {
  let createUserResponseBody;

  test("Create user account", async () => {
    const createUserResponse = await fetch(`http://localhost:3000/api/v1/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "RegistrationFlow",
        email: "registration.flow@email.com",
        password: "password123",
      }),
    });

    expect(createUserResponse.status).toBe(201);

    createUserResponseBody = await createUserResponse.json();
    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      email: "registration.flow@email.com",
      features: ["read:activation_token"],
      password: createUserResponseBody.password,
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    const activationToken = await activation.findOneByUserId(createUserResponseBody.id);

    expect(lastEmail).not.toBeNull();
    expect(lastEmail.sender).toBe("<email@djonathan.com>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@email.com>");
    expect(lastEmail.subject).toBe("Activate your account");
    expect(lastEmail.text).toContain("RegistrationFlow");
    expect(lastEmail.text).toContain(activationToken.id);
  });

  test("Activate user account", async () => { });
  test("Login to user account", async () => { });
  test("Get user information", async () => { });
});
