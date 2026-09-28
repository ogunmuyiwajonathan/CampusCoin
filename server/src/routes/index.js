import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import ledgerRoutes from "./ledger.routes.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ name: "CampusCoin API", docs: "/api/health" });
});

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/", ledgerRoutes);

export default router;
