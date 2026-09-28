import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const conversationSchema = defineSchema(
  "conversation_id",
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    lastMessageAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

conversationSchema.index({ user_id: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
