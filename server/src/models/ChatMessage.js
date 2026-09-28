import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const proposalSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "", trim: true, maxlength: 140 },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    category_name: { type: String, default: null, trim: true, maxlength: 60 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    transaction_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: false },
);

const chatMessageSchema = defineSchema(
  "chat_message_id",
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "", trim: true },
    kind: { type: String, enum: ["text", "proposal"], default: "text" },
    proposal: { type: proposalSchema, default: null },
  },
  { timestamps: true },
);

chatMessageSchema.index({ conversation_id: 1, createdAt: 1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
