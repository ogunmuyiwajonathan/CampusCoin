import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as auth from "../controllers/auth.controller.js";
import { avatarUpload, uploadAvatar } from "../controllers/avatar.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/auth.schema.js";

const router = Router();

router.post("/register", validate({ body: registerSchema }), auth.register);
router.post("/login", validate({ body: loginSchema }), auth.login);
router.post("/logout", auth.logout);
router.post("/forgot-password", validate({ body: forgotPasswordSchema }), auth.forgotPassword);
router.post("/reset-password", validate({ body: resetPasswordSchema }), auth.resetPassword);

// The client calls this before anything else on boot, so it sits outside
// requireAuth and has to report "not signed in" as a normal answer.
router.get("/me", auth.me);
router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), auth.updateProfile);
router.post("/me/avatar", requireAuth, avatarUpload, uploadAvatar);

export default router;
