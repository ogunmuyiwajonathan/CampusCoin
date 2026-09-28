import mongoose from "mongoose";
import { env } from "./env.js";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

let memoryServer = null;

async function resolveUri() {
  if (!env.useMemoryDb) return env.mongoUri;

  console.log("MONGODB_URI is blank - starting an in-memory MongoDB.");
  if (process.env.MONGOMS_SYSTEM_BINARY) {
    console.log("Using the mongod binary named by MONGOMS_SYSTEM_BINARY.");
  } else {
    console.log("The first run downloads a mongod binary once, then it is cached.");
  }

  // Imported lazily so the dependency and its download cost are only paid when
  // the in-memory mode is actually used.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = await MongoMemoryServer.create();
  return memoryServer.getUri();
}

export async function connectDb({ attempts = MAX_ATTEMPTS } = {}) {
  mongoose.set("strictQuery", true);

  const uri = await resolveUri();
  const label = env.useMemoryDb ? "in-memory MongoDB (development only)" : "MongoDB";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log(`${label} connected (${env.nodeEnv})`);
      return;
    } catch (error) {
      const isLast = attempt === attempts;
      console.error(
        `MongoDB connection attempt ${attempt}/${attempts} failed: ${error.message}`,
      );
      if (isLast) throw error;
      const delay = attempt * BASE_DELAY_MS;
      console.error(`Retrying in ${delay / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function disconnectDb() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
