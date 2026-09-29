import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as bookmarks from "../controllers/bookmarks.controller.js";
import { idParamSchema } from "../validators/ledger.schema.js";
import {
  createBookmarkSchema,
  updateBookmarkSchema,
} from "../validators/bookmarks.schema.js";

const router = Router();

const auth = [requireAuth];

router.get("/bookmarks", ...auth, bookmarks.getBookmarks);
router.post("/bookmarks", ...auth, validate({ body: createBookmarkSchema }), bookmarks.postBookmark);
router.patch(
  "/bookmarks/:id",
  ...auth,
  validate({ params: idParamSchema, body: updateBookmarkSchema }),
  bookmarks.patchBookmark,
);
router.delete(
  "/bookmarks/:id",
  ...auth,
  validate({ params: idParamSchema }),
  bookmarks.removeBookmark,
);

export default router;
