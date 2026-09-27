import mongoose from "mongoose";
import { env } from "./env.js";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

export async function connectDb({ attempts = MAX_ATTEMPTS } = {}) {
  mongoose.set("strictQuery", true);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
      console.log(`MongoDB connected (${env.nodeEnv})`);
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
}
