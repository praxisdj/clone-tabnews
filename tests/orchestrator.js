import retry from "async-retry";
import { faker } from "@faker-js/faker";

import database from "infra/database.js";
import migrator from "models/migrator";
import user from "models/user";
import session from "models/session";
import activation from "models/activation";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}/messages`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");
      await response.json();
    }
  }

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);
      await response.json();
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userData) {
  return await user.create({
    username:
      userData.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userData.email || faker.internet.email(),
    password: userData.password || "test password",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function deleteAllEmails() {
  await fetch(emailHttpUrl, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const response = await fetch(emailHttpUrl);
  const emails = await response.json();
  const lastEmailItem = emails.pop();

  if (!lastEmailItem) {
    return null;
  }

  const lastEmailResponse = await fetch(
    `${emailHttpUrl}/${lastEmailItem.id}.plain`,
  );
  const lastEmailText = await lastEmailResponse.text();
  lastEmailItem.text = lastEmailText;

  return lastEmailItem;
}

function extractUUID(text) {
  const match = text.match(/[0-9a-fA-F-]{36}/);
  return match ? match[0] : null;
}

async function activateUser(userId) {
  return await activation.activateUserByUserId(userId);
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  deleteAllEmails,
  getLastEmail,
  extractUUID,
  activateUser,
};

export default orchestrator;
