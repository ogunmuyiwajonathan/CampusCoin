import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

const READY_STATES = [
  "disconnected",
  "connected",
  "connecting",
  "disconnecting",
  "uninitialized",
];

router.get("/", (req, res) => {
  const db = READY_STATES[mongoose.connection.readyState] ?? "unknown";
  res.json({
    ok: db === "connected",
    db,
    env: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.round(process.uptime()),
  });
});

export default router;
