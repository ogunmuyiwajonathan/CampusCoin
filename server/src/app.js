import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// One reverse proxy in front of us in production (Render/Railway). Without this
// every request looks like it came from the proxy, so rate limiting would count
// all visitors as one client.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

if (!env.isProd) {
  app.use(morgan("dev"));
}

// Brute-force guard on the auth routes. The limit is per IP per window, and the
// message never says whether an account exists.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: { message: "Too many attempts. Please try again in 15 minutes." },
  },
});

app.use("/api/auth", authLimiter);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
