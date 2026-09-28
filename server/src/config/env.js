import "dotenv/config";

const REQUIRED = ["MONGODB_URI", "CORS_ORIGIN"];

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

// A session signed with a throwaway secret is forgeable by anyone who has read
// the source, so production must supply one. Development gets a fixed default
// rather than a random one, otherwise every restart would silently log
// everyone out and there would be no way to reproduce a session locally.
const sessionSecret = process.env.SESSION_SECRET?.trim() || "";

if (sessionSecret === "" && nodeEnv === "production") {
  console.error("SESSION_SECRET is required when NODE_ENV=production.");
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// The database name is parsed out separately so the startup log says which
// database this process is actually talking to. Two of them exist - campuscoin
// for the app and campuscoin_test for the test runs - and a mistyped URI that
// silently pointed a deploy at the test database would be a quiet disaster.
const mongoUri = process.env.MONGODB_URI.trim();
const mongoDbName = (() => {
  const withoutQuery = mongoUri.split("?")[0];
  const segments = withoutQuery.split("/");
  return segments.length > 3 ? segments.pop() : null;
})();

export const env = {
  nodeEnv,
  isDev: nodeEnv === "development",
  isProd: nodeEnv === "production",
  port,
  mongoUri,
  mongoDbName,
  corsOrigins,
  sessionSecret: sessionSecret || "dev-only-insecure-session-secret",
  // Overrides the origin used in password-reset links. Falls back to the
  // request host so preview URLs work without a redeploy.
  appOrigin: process.env.APP_ORIGIN?.trim() || null,
  // With no key the mailer logs the reset link to the console instead, so the
  // reset flow stays testable before email is configured.
  resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
  emailFrom: process.env.EMAIL_FROM?.trim() || "CampusCoin <no-reply@campuscoin.app>",
};
