import asyncHandler from "../utils/asyncHandler.js";
import * as ledger from "../services/ledger.service.js";

const me = (req) => req.user._id;

export const listCategories = asyncHandler(async (req, res) => {
  res.json({ categories: await ledger.listCategories(me(req)) });
});

export const createCategory = asyncHandler(async (req, res) => {
  res.status(201).json({ category: await ledger.createCategory(me(req), req.body) });
});

export const updateCategory = asyncHandler(async (req, res) => {
  res.json({ category: await ledger.updateCategory(me(req), req.params.id, req.body) });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await ledger.deleteCategory(me(req), req.params.id);
  res.json({ ok: true });
});

export const listTransactions = asyncHandler(async (req, res) => {
  res.json({ transactions: await ledger.listTransactions(me(req), req.validatedQuery?.month) });
});

export const listTransactionHistory = asyncHandler(async (req, res) => {
  res.json({ history: await ledger.listTransactionHistory(me(req)) });
});

export const restoreTransaction = asyncHandler(async (req, res) => {
  const restored = await ledger.restoreTransaction(me(req), req.params.id);
  res.status(201).json({ transaction: restored });
});

export const createTransaction = asyncHandler(async (req, res) => {
  res.status(201).json({ transaction: await ledger.createTransaction(me(req), req.body) });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  res.json({ transaction: await ledger.updateTransaction(me(req), req.params.id, req.body) });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  await ledger.deleteTransaction(me(req), req.params.id);
  res.json({ ok: true });
});

export const listBudgets = asyncHandler(async (req, res) => {
  res.json({ budgets: await ledger.listBudgets(me(req), req.validatedQuery?.month) });
});

export const createBudget = asyncHandler(async (req, res) => {
  res.status(201).json({ budget: await ledger.createBudget(me(req), req.body) });
});

export const updateBudget = asyncHandler(async (req, res) => {
  res.json({ budget: await ledger.updateBudget(me(req), req.params.id, req.body) });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  await ledger.deleteBudget(me(req), req.params.id);
  res.json({ ok: true });
});

export const listNotifications = asyncHandler(async (req, res) => {
  res.json({ notifications: await ledger.listNotifications(me(req)) });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  res.json({ notification: await ledger.markNotificationRead(me(req), req.params.id) });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  res.json({ ok: true, remaining: await ledger.markAllNotificationsRead(me(req)) });
});
