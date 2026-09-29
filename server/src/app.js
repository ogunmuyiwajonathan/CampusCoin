import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env.js";
import { sessionMiddleware } from "./config/session.js";
import { loadUser, requireTrustedOrigin } from "./middleware/requireAuth.js";
import { isTrustedOrigin } from "./utils/trustedOrigin.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => callback(null, isTrustedOrigin(origin)),
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(
  "/uploads",
  express.static(env.uploadDir, { maxAge: "7d", index: false, dotfiles: "deny" }),
);

if (!env.isProd) {
  app.use(morgan("dev"));
}

app.use(sessionMiddleware());
app.use(loadUser);
app.use(requireTrustedOrigin);

app.use("/api", apiLimiter);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
