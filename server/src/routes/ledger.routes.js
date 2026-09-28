import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as ledger from "../controllers/ledger.controller.js";
import {
  createBudgetSchema,
  createCategorySchema,
  createTransactionSchema,
  idParamSchema,
  monthSchema,
  updateBudgetSchema,
  updateCategorySchema,
  updateTransactionSchema,
} from "../validators/ledger.schema.js";

const router = Router();

// requireAuth is applied per route rather than as a blanket router.use. This
// router is mounted at /api, so a router-wide guard would also catch any path
// that does not exist and answer 401 instead of letting notFound answer 404.
const auth = [requireAuth];

router.get("/categories", ...auth, ledger.listCategories);
router.post("/categories", ...auth, validate({ body: createCategorySchema }), ledger.createCategory);
router.patch(
  "/categories/:id",
  ...auth,
  validate({ params: idParamSchema, body: updateCategorySchema }),
  ledger.updateCategory,
);
router.delete("/categories/:id", ...auth, validate({ params: idParamSchema }), ledger.deleteCategory);

router.get("/transactions", ...auth, validate({ query: monthSchema }), ledger.listTransactions);
router.post("/transactions", ...auth, validate({ body: createTransactionSchema }), ledger.createTransaction);
router.patch(
  "/transactions/:id",
  ...auth,
  validate({ params: idParamSchema, body: updateTransactionSchema }),
  ledger.updateTransaction,
);
router.delete("/transactions/:id", ...auth, validate({ params: idParamSchema }), ledger.deleteTransaction);

router.get("/budgets", ...auth, validate({ query: monthSchema }), ledger.listBudgets);
router.post("/budgets", ...auth, validate({ body: createBudgetSchema }), ledger.createBudget);
router.patch(
  "/budgets/:id",
  ...auth,
  validate({ params: idParamSchema, body: updateBudgetSchema }),
  ledger.updateBudget,
);
router.delete("/budgets/:id", ...auth, validate({ params: idParamSchema }), ledger.deleteBudget);

router.get("/notifications", ...auth, ledger.listNotifications);
router.patch("/notifications/read-all", ...auth, ledger.markAllNotificationsRead);
router.patch("/notifications/:id/read", ...auth, validate({ params: idParamSchema }), ledger.markNotificationRead);

export default router;
