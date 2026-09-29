import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import aiRoutes from "./ai.routes.js";
import ledgerRoutes from "./ledger.routes.js";
import adminRoutes from "./admin.routes.js";
import reportsRoutes from "./reports.routes.js";
import bookmarksRoutes from "./bookmarks.routes.js";
import insightsRoutes from "./insights.routes.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ name: "CampusCoin API", docs: "/api/health" });
});

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/ai", aiRoutes);
// Admin routes (which includes /announcements for students too)
router.use("/", adminRoutes);
router.use("/", ledgerRoutes);
router.use("/", reportsRoutes);
router.use("/", bookmarksRoutes);
router.use("/", insightsRoutes);

export default router;
