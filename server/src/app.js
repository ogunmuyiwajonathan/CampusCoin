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

// One reverse proxy in front of us in production (Render/Railway). Without this
// every request looks like it came from the proxy, so rate limiting would count
// all visitors as one client.
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

// Uploaded avatars. Served from here rather than the client bundle so the URL
// on the user record keeps working after a redeploy.
app.use(
  "/uploads",
  express.static(env.uploadDir, { maxAge: "7d", index: false, dotfiles: "deny" }),
);

if (!env.isProd) {
  app.use(morgan("dev"));
}

// Session first, then the user it identifies. Both have to sit above the
// routes, and loadUser has to sit above every route that reads req.user.
app.use(sessionMiddleware());
app.use(loadUser);
app.use(requireTrustedOrigin);

// Broad ceiling for the whole API. The routes that are worth guessing at -
// sign-in, registration, password reset - carry their own tighter limiter in
// routes/*.routes.js, which stacks on top of this one.
app.use("/api", apiLimiter);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
