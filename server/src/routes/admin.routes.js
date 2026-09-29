import { Router } from "express";
import * as adminCtrl from "../controllers/admin.controller.js";
import { adminLogin } from "../controllers/adminAuth.controller.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import validate from "../middleware/validate.js";
import { adminLoginLimiter } from "../middleware/rateLimiters.js";
import {
  categoryBodySchema,
  tipTemplateBodySchema,
  announcementBodySchema,
} from "../validators/admin.schema.js";

const router = Router();

router.post("/admin/auth/login", adminLoginLimiter, adminLogin);

router.get("/announcements", requireAuth, adminCtrl.getActiveAnnouncements);

// Admin routes
router.use("/admin", requireAuth, requireAdmin);

// Dashboard stats
router.get("/admin/stats", adminCtrl.getStats);

// Users
router.get("/admin/users", adminCtrl.getUsers);
router.put("/admin/users/:id/disable", adminCtrl.disableUser);
router.put("/admin/users/:id/enable", adminCtrl.enableUser);
router.put("/admin/users/:id/reset", adminCtrl.resetUser);

// Categories
router.get("/admin/categories", adminCtrl.getDefaultCategories);
router.post("/admin/categories", validate({ body: categoryBodySchema }), adminCtrl.createDefaultCategory);
router.put("/admin/categories/:id", validate({ body: categoryBodySchema }), adminCtrl.updateDefaultCategory);
router.delete("/admin/categories/:id", adminCtrl.deleteDefaultCategory);

// Tip Templates
router.get("/admin/tips", adminCtrl.getTipTemplates);
router.post("/admin/tips", validate({ body: tipTemplateBodySchema }), adminCtrl.createTipTemplate);
router.put("/admin/tips/:id", validate({ body: tipTemplateBodySchema }), adminCtrl.updateTipTemplate);
router.delete("/admin/tips/:id", adminCtrl.deleteTipTemplate);

// Announcements
router.get("/admin/announcements", adminCtrl.getAnnouncementsAdmin);
router.post("/admin/announcements", validate({ body: announcementBodySchema }), adminCtrl.createAnnouncement);
router.put("/admin/announcements/:id", validate({ body: announcementBodySchema }), adminCtrl.updateAnnouncement);
router.delete("/admin/announcements/:id", adminCtrl.deleteAnnouncement);

export default router;
