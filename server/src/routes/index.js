import { Router } from "express";
import healthRoutes from "./health.routes.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ name: "CampusCoin API", docs: "/api/health" });
});

router.use("/health", healthRoutes);

export default router;
