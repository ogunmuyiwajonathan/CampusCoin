import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Category } from "../models/Category.js";
import { TipTemplate } from "../models/TipTemplate.js";
import { Announcement } from "../models/Announcement.js";

export const getStats = async (req, res) => {
  // Active users: students whose accounts are currently enabled and not disabled.
  const activeUsers = await User.countDocuments({ is_active: true, role: 'student' });
  const totalUsers = await User.countDocuments({ role: 'student' });
  const totalTransactions = await Transaction.countDocuments();
  
  const mostUsedCategories = await Transaction.aggregate([
    { $group: { _id: "$category_id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
    { $unwind: "$category" },
    { $project: { _id: 1, count: 1, name: "$category.name", type: "$category.type" } }
  ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = `${sixMonthsAgo.getUTCFullYear()}-${String(sixMonthsAgo.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const transactionsPerMonth = await Transaction.aggregate([
    { $match: { date: { $gte: from } } },
    { $group: { 
        _id: { $substrBytes: ["$date", 0, 7] }, 
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      } 
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({ totalUsers, activeUsers, totalTransactions, mostUsedCategories, transactionsPerMonth });
};

export const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const users = await User.find(query)
    .select("name email academic_year createdAt is_active role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
};

// Sets the flag to an explicit value rather than flipping it. The two are not the
// same thing: a toggle cannot be called twice without the second call undoing the
// first, so a retry after a dropped response, or a second admin pressing the
// button at the same moment, would re-enable a student the first one disabled.
async function setUserActive(req, res, isActive) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") {
    return res.status(400).json({ message: "Cannot change an admin account" });
  }

  const already = user.is_active === isActive;
  user.is_active = isActive;
  await user.save();

  // Signing a student out is the point of disabling, so a disabled account
  // cannot keep reading the API with the session cookie it already has.
  if (!isActive && !already) {
    // The session document is a serialised string, so the user id is matched as
    // text. Escaped because it is hex and therefore safe either way, but a
    // pattern built from an unescaped id is a habit worth not having.
    await mongoose.connection.collection("sessions").deleteMany({
      session: { $regex: `"userId":"${user._id.toString()}"` },
    });
  }

  return res.json({
    message: `User ${isActive ? "enabled" : "disabled"} successfully`,
    user: { _id: user._id, is_active: user.is_active },
  });
}

export const disableUser = async (req, res) => setUserActive(req, res, false);

export const enableUser = async (req, res) => setUserActive(req, res, true);

export const resetUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === 'admin') return res.status(400).json({ message: "Cannot reset an admin account" });

  const tempPassword = crypto.randomBytes(6).toString("hex") + "A1!";
  user.password_hash = await bcrypt.hash(tempPassword, 10);
  await user.save();

  // Destroy sessions so they must log in with the new password
  await mongoose.connection.collection("sessions").deleteMany({
    session: { $regex: `"userId":"${user._id.toString()}"` }
  });

  res.json({ message: "User password reset successfully", temporaryPassword: tempPassword });
};

export const getDefaultCategories = async (req, res) => {
  const categories = await Category.find({ is_default: true }).sort({ type: 1, name: 1 });
  res.json(categories);
};

export const createDefaultCategory = async (req, res) => {
  const { name, type, icon_key = null, icon_svg = null } = req.body;
  const category = new Category({ name, type, is_default: true, icon_key, icon_svg });
  await category.save();
  res.status(201).json(category);
};

export const updateDefaultCategory = async (req, res) => {
  const { id } = req.params;
  const { name, type, icon_key, icon_svg } = req.body;
  const patch = { name, type };
  if (icon_key !== undefined) patch.icon_key = icon_key;
  if (icon_svg !== undefined) patch.icon_svg = icon_svg;
  const category = await Category.findOneAndUpdate(
    { _id: id, is_default: true },
    patch,
    { new: true, runValidators: true }
  );
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json(category);
};

export const deleteDefaultCategory = async (req, res) => {
  const { id } = req.params;
  const category = await Category.findOne({ _id: id, is_default: true });
  if (!category) return res.status(404).json({ message: "Category not found" });

  const hasTransactions = await Transaction.exists({ category_id: id });
  if (hasTransactions) {
    return res.status(400).json({ message: "Cannot delete category: it is used by existing transactions." });
  }

  await category.deleteOne();
  res.json({ message: "Category deleted" });
};

export const getTipTemplates = async (req, res) => {
  const templates = await TipTemplate.find().populate("category_id").sort({ savings_impact: -1 });
  res.json(templates);
};

export const createTipTemplate = async (req, res) => {
  const template = new TipTemplate(req.body);
  await template.save();
  res.status(201).json(template);
};

export const updateTipTemplate = async (req, res) => {
  const { id } = req.params;
  const template = await TipTemplate.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!template) return res.status(404).json({ message: "Template not found" });
  res.json(template);
};

export const deleteTipTemplate = async (req, res) => {
  const { id } = req.params;
  const template = await TipTemplate.findByIdAndDelete(id);
  if (!template) return res.status(404).json({ message: "Template not found" });
  res.json({ message: "Template deleted" });
};

export const getAnnouncementsAdmin = async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  res.json(announcements);
};

export const createAnnouncement = async (req, res) => {
  const announcement = new Announcement({
    ...req.body,
    createdBy: req.user._id
  });
  await announcement.save();
  res.status(201).json(announcement);
};

export const updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!announcement) return res.status(404).json({ message: "Announcement not found" });
  res.json(announcement);
};

export const deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) return res.status(404).json({ message: "Announcement not found" });
  res.json({ message: "Announcement deleted" });
};

// Student endpoint
export const getActiveAnnouncements = async (req, res) => {
  const announcements = await Announcement.find({ active: true })
    .sort({ createdAt: -1 })
    .select("title body createdAt");
  res.json(announcements);
};
