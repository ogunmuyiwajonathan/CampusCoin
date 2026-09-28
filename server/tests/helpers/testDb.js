// Every test run goes against the real Atlas cluster, in a separate database
// so it can never touch the demo data in campuscoin.
//
// The guard below is the point of this file. A test that calls dropDatabase()
// with a wrong URI would delete the dataset a demo depends on, and no amount of
// care in the test body prevents that. So the database name is derived here,
// once, and every destructive helper re-checks it before touching anything.
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

// Rewrites whatever database the app URI names to the test one, leaving the
// credentials, host and options untouched.
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

// Must be called before anything imports the app or the config, because
// config/env.js reads process.env once at module load. Without this a test
// that boots the whole app would put its users and sessions in the demo
// database, which is exactly the accident this file exists to prevent.
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
