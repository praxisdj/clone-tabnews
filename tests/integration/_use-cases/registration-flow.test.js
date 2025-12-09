import orchestrator from "tests/orchestrator.js";
import activation from "models/activation.js";
import webserver from "infra/webserver.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use Case: Registration Flow - Success", () => {
  let createUserResponseBody, activationTokenId;

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

    activationTokenId = await orchestrator.extractUUID(lastEmail.text);
    expect(lastEmail.text).toContain(`${webserver.origin}/user/activate/${activationTokenId}`);

    const activationTokenObject = await activation.findOneValidById(activationTokenId);
    expect(activationTokenObject.user_id).toBe(createUserResponseBody.id);
    expect(activationTokenObject.used_at).toBeNull();

    expect(lastEmail).not.toBeNull();
    expect(lastEmail.sender).toBe("<email@djonathan.com>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@email.com>");
    expect(lastEmail.subject).toBe("Activate your account");
    expect(lastEmail.text).toContain("RegistrationFlow");
  });

  test("Activate user account", async () => {
    const activationResponse = await fetch(`http://localhost:3000/api/v1/activations/${activationTokenId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: activationTokenId,
      }),
    });

    expect(activationResponse.status).toBe(200);

    const activationResponseBody = await activationResponse.json();
    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUserName("RegistrationFlow");
    expect(activatedUser.features).toEqual(["create:session"]);
  });


  test("Login to user account", async () => { });
  test("Get user information", async () => { });
});
