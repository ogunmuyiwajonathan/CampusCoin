import asyncHandler from "../utils/asyncHandler.js";
import { buildReport, listReportCategories } from "../services/reports.service.js";

export const getReports = asyncHandler(async (req, res) => {
  const { from, to, category, granularity } = req.query;
  const report = await buildReport(req.user.user_id, {
    from: from ?? null,
    to: to ?? null,
    categoryId: category ?? null,
    granularity: granularity ?? "day",
  });
  res.json(report);
});

export const getReportCategories = asyncHandler(async (req, res) => {
  const rows = await listReportCategories(req.user.user_id);
  res.json({
    categories: rows.map((c) => ({
      category_id: String(c._id),
      name: c.name,
      type: c.type,
    })),
  });
});

export const shareReport = asyncHandler(async (req, res) => {
  const { message, email, from, to } = req.body;
  const report = await buildReport(req.user.user_id, {
    from: from ?? null,
    to: to ?? null,
    categoryId: req.body.category ?? null,
    granularity: req.body.granularity ?? "day",
  });

  let mail = { delivered: false, reason: "not_requested" };
  if (email) {
    const { sendReportEmail } = await import("../services/mail.service.js");
    mail = await sendReportEmail({ to: email, name: req.user.name, message, report });
  }

  res.json({ ok: true, mail, report });
});
