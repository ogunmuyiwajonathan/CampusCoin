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

export const AI_DEFAULT_LIMIT = 60;
export const AI_TEST_LIMIT = 1000;

// The test suite fires far more questions than a student ever would, so it runs
// under a raised ceiling. That ceiling must never reach production: a deployed
// instance quietly accepting 1000 questions an hour would turn a paid API into
// an open one, so the process refuses to start rather than clamp it silently.
function readAiRateLimit(raw) {
  if (nodeEnv === "test") return AI_TEST_LIMIT;

  const value = raw?.trim();
  if (!value) return AI_DEFAULT_LIMIT;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`AI_RATE_LIMIT must be a whole number of questions per hour, got "${value}".`);
    process.exit(1);
  }

  if (nodeEnv === "production" && parsed >= AI_TEST_LIMIT) {
    console.error(
      `AI_RATE_LIMIT=${parsed} is the test override and NODE_ENV is production. Refusing to start.`,
    );
    process.exit(1);
  }

  return parsed;
}

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
  uploadDir: process.env.UPLOAD_DIR?.trim() || "uploads",
  adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD?.trim() || null,
  // The AI provider. Optional rather than required, so the app still boots and
  // every non-AI screen still works on a machine with no key. When it is absent
  // the assistant answers from the student's own numbers using the same rules
  // the tips engine uses, and every response says so, rather than pretending.
  poolsideApiKey: process.env.POOLSIDE_API_KEY?.trim() || null,
  poolsideBaseUrl: process.env.POOLSIDE_BASE_URL?.trim() || "https://inference.poolside.ai/v1",
  poolsideModel: process.env.POOLSIDE_MODEL?.trim() || "poolside/laguna-xs-2.1",
  aiRateLimit: readAiRateLimit(process.env.AI_RATE_LIMIT),
  // Which seeded account a demo hands out. Leaving it unset turns the demo
  // shortcut off entirely and the real login form takes over again, so the
  // switch is one variable rather than a code change.
  demoLoginEmail: process.env.DEMO_LOGIN_EMAIL?.trim() || null,
};

// A demo shortcut that signs everybody in as the same student is a hole in the
// auth story, not a convenience. It must never reach a deployed environment, so
// a production boot with it set stops here rather than quietly serving an app
// where any visitor is already authenticated.
if (env.demoLoginEmail && env.isProd) {
  console.error("DEMO_LOGIN_EMAIL is set but NODE_ENV=production.");
  console.error("The demo shortcut signs every visitor in as one account. Unset it to deploy.");
  process.exit(1);
}
