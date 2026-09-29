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

const nodeEnv = process.env.NODE_ENV ?? "production";

const sessionSecret = process.env.SESSION_SECRET?.trim() || "";

export const AI_DEFAULT_LIMIT = 60;
export const AI_TEST_LIMIT = 1000;

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
  appOrigin: process.env.APP_ORIGIN?.trim() || null,
  resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
  emailFrom: process.env.EMAIL_FROM?.trim() || "CampusCoin <no-reply@campuscoin.app>",
  uploadDir: process.env.UPLOAD_DIR?.trim() || "uploads",
  adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD?.trim() || null,
  poolsideApiKey: process.env.POOLSIDE_API_KEY?.trim() || null,
  poolsideBaseUrl: process.env.POOLSIDE_BASE_URL?.trim() || "https://inference.poolside.ai/v1",
  poolsideModel: process.env.POOLSIDE_MODEL?.trim() || "poolside/laguna-xs-2.1",
  aiRateLimit: readAiRateLimit(process.env.AI_RATE_LIMIT),
  demoLoginEmail: process.env.DEMO_LOGIN_EMAIL?.trim() || null,
};

if (env.demoLoginEmail && env.isProd) {
  console.error("DEMO_LOGIN_EMAIL is set but NODE_ENV=production.");
  console.error("The demo shortcut signs every visitor in as one account. Unset it to deploy.");
  process.exit(1);
}
