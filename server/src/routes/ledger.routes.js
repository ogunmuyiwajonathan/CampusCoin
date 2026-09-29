import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as ledger from "../controllers/ledger.controller.js";
import { importCsv, undoImport, upload } from "../controllers/import.controller.js";
import {
  createBudgetSchema,
  createCategorySchema,
  createTransactionSchema,
  idParamSchema,
  monthSchema,
  updateBudgetSchema,
  updateCategorySchema,
  updateTransactionSchema,
  batchParamsSchema,
} from "../validators/ledger.schema.js";

const router = Router();

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

router.get("/transactions/history", ...auth, ledger.listTransactionHistory);
router.post(
  "/transactions/history/:id/restore",
  ...auth,
  validate({ params: idParamSchema }),
  ledger.restoreTransaction,
);

router.post(
  "/transactions/import",
  ...auth,
  upload.single("file"),
  importCsv,
);
router.delete(
  "/transactions/import/:batchId",
  ...auth,
  validate({ params: batchParamsSchema }),
  undoImport,
);

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
