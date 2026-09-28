import "dotenv/config";

const REQUIRED = ["CORS_ORIGIN"];

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  console.error("Copy server/.env.example to server/.env and fill in the blanks.");
  process.exit(1);
}

const corsOrigins = process.env.CORS_ORIGIN.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  console.error("CORS_ORIGIN is set but empty. List at least one allowed origin.");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT must be a whole number between 1 and 65535, got "${process.env.PORT}".`);
  process.exit(1);
}

// Defaults to production, not development, on purpose. A deployed environment
// that forgets NODE_ENV must not start behaving like a dev machine: the error
// handler keys its verbose output off isDev, so defaulting the other way would
// leak internal messages to whoever triggered the error.
const nodeEnv = process.env.NODE_ENV ?? "production";

const mongoUri = process.env.MONGODB_URI?.trim() ?? "";

// A blank MONGODB_URI selects an in-memory MongoDB, which is how this project
// develops and how the test suite runs. It is never allowed in production: an
// ephemeral database discards every write the moment the process exits, so a
// deploy with a missing, blank or unreadable MONGODB_URI would start up looking
// perfectly healthy and then silently lose all of its data. Refusing to boot is
// the only safe answer.
if (mongoUri === "" && nodeEnv === "production") {
  console.error("MONGODB_URI is required when NODE_ENV=production.");
  console.error("The in-memory database is for development and tests only; it discards all data on exit.");
  process.exit(1);
}

export const env = {
  nodeEnv,
  isDev: nodeEnv === "development",
  isProd: nodeEnv === "production",
  port,
  mongoUri,
  useMemoryDb: mongoUri === "",
  corsOrigins,
};
