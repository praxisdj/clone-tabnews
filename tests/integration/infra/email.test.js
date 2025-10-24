import email from "infra/email.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email", () => {
  describe("send", () => {
    test("send()", async () => {
      await orchestrator.deleteAllEmails();

      await email.send({
        from: "DJ <email@djonathan.com>",
        to: "receiver@test.com",
        subject: "Test email subject",
        text: "This is a test email sent from the integration test.",
      });

      const lastEmail = await orchestrator.getLastEmail();
      expect(lastEmail).not.toBeNull();
      expect(lastEmail.sender).toBe("<email@djonathan.com>");
      expect(lastEmail.subject).toBe("Test email subject");
      expect(lastEmail.recipients[0]).toBe("<receiver@test.com>");
      expect(lastEmail.text).toBe("This is a test email sent from the integration test.\n");
    });
  });
});
