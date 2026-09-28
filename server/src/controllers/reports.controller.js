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

// The category filter needs ids the student can actually see.
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

  // Mail is a best-effort side effect of the request, never a reason to fail
  // it: the report is already built and the student can still see it. The
  // outcome is reported honestly so the UI can say what actually happened
  // rather than claiming a message was sent.
  let mail = { delivered: false, reason: "not_requested" };
  if (email) {
    const { sendReportEmail } = await import("../services/mail.service.js");
    mail = await sendReportEmail({ to: email, name: req.user.name, message, report });
  }

  res.json({ ok: true, mail, report });
});
