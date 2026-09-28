import mongoose from "mongoose";
import { env } from "../src/config/env.js";

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  process.stdout.write("DB CONNECTED\n");
  await mongoose.disconnect();
} catch (error) {
  process.stdout.write(`DB FAIL: ${String(error.message).slice(0, 100)}\n`);
}
