import mongoose from "mongoose";

export const TEST_DB_NAME = "campuscoin_test";

function assertTestDatabase(uri) {
  const name = uri.split("?")[0].split("/").pop();
  if (name !== TEST_DB_NAME) {
    throw new Error(
      `Refusing to run a test against database "${name}". Tests may only touch ` +
        `"${TEST_DB_NAME}". Check MONGODB_URI in server/.env.`,
    );
  }
  return uri;
}

export function testDatabaseUri() {
  const base = process.env.MONGODB_URI?.trim();
  if (!base) {
    throw new Error("MONGODB_URI is not set, so there is nothing to run tests against.");
  }
  const swapped = base.replace(/\/[^/?]*(\?.*)?$/, `/${TEST_DB_NAME}$1`);
  return assertTestDatabase(swapped);
}

export async function connectTestDb() {
  const uri = testDatabaseUri();
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const actual = mongoose.connection.name;
  if (actual !== TEST_DB_NAME) {
    throw new Error(`Connected to "${actual}" instead of "${TEST_DB_NAME}". Aborting.`);
  }
  console.log(`connected to test database "${actual}"`);
  return uri;
}

export function useTestDatabaseEnv() {
  const uri = testDatabaseUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = "test";
  return uri;
}

export async function resetTestDb() {
  const name = mongoose.connection.name;
  if (name !== TEST_DB_NAME) {
    throw new Error(`Refusing to drop "${name}". Only "${TEST_DB_NAME}" may be dropped.`);
  }
  await mongoose.connection.dropDatabase();
}

export async function closeTestDb() {
  await mongoose.connection.close();
}
