import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";

async function start() {
  await connectDb();

  const server = app.listen(env.port, () => {
    console.log(`CampusCoin API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, closing server.`);
    server.close(async () => {
      await disconnectDb();
      console.log("Closed cleanly.");
      process.exit(0);
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Failed to start the server:", error.message);
  process.exit(1);
});
