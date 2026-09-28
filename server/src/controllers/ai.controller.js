import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ChatMessage, Conversation } from "../models/index.js";
import { serialize } from "../utils/idOptions.js";
import { createTransaction } from "../services/ledger.service.js";
import * as ai from "../services/ai.service.js";

const me = (req) => req.user._id;

function titleFrom(message) {
  const text = String(message).trim().replace(/\s+/g, " ");
  return text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text;
}

async function ownedConversation(userId, id) {
  const conversation = await Conversation.findOne({ _id: id, user_id: userId }).lean();
  if (!conversation) throw ApiError.notFound("That chat could not be found.");
  return conversation;
}

async function ownedMessage(userId, id) {
  const message = await ChatMessage.findById(id).lean();
  if (!message) throw ApiError.notFound("That message could not be found.");
  const conversation = await Conversation.findOne({
    _id: message.conversation_id,
    user_id: userId,
  })
    .select("_id")
    .lean();
  if (!conversation) throw ApiError.notFound("That message could not be found.");
  return message;
}

export const askAi = asyncHandler(async (req, res) => {
  const userId = me(req);
  const { message, conversationId } = req.body;

  let conversation;
  if (conversationId) {
    conversation = await ownedConversation(userId, conversationId);
  } else {
    conversation = await Conversation.create({
      user_id: userId,
      title: titleFrom(message),
      lastMessageAt: new Date(),
    });
  }

  const history = await ChatMessage.find({ conversation_id: conversation._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const result = await ai.converse({
    userId,
    history: history.reverse(),
    message,
  });

  const now = new Date();
  const userMessage = await ChatMessage.create({
    conversation_id: conversation._id,
    role: "user",
    content: message,
    kind: "text",
  });

  const assistantMessage = await ChatMessage.create({
    conversation_id: conversation._id,
    role: "assistant",
    content: result.reply,
    kind: result.proposal ? "proposal" : "text",
    proposal: result.proposal
      ? {
          amount: result.proposal.amount,
          description: result.proposal.description,
          category_id: result.proposal.category_id,
          category_name: result.proposal.category_name,
          date: result.proposal.date,
          status: "pending",
        }
      : null,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: now } },
  );

  res.status(201).json({
    conversationId: String(conversation._id),
    reply: result.reply,
    user_message: serialize(
      userMessage.toObject ? userMessage.toObject() : userMessage,
      "chat_message_id",
    ),
    assistant_message: serialize(
      assistantMessage.toObject ? assistantMessage.toObject() : assistantMessage,
      "chat_message_id",
    ),
  });
});

export const listConversations = asyncHandler(async (req, res) => {
  const { limit, cursor } = req.validatedQuery;
  const query = { user_id: me(req) };

  if (cursor) {
    const anchor = await Conversation.findOne({ _id: cursor, user_id: me(req) }).lean();
    if (anchor) {
      query.$or = [
        { lastMessageAt: { $lt: anchor.lastMessageAt } },
        { lastMessageAt: anchor.lastMessageAt, _id: { $lt: anchor._id } },
      ];
    }
  }

  const rows = await Conversation.find(query)
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  res.json({
    conversations: page.map((row) => ({
      id: String(row._id),
      title: row.title,
      lastMessageAt: row.lastMessageAt,
    })),
    nextCursor: hasMore ? String(page[page.length - 1]._id) : null,
  });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  await ownedConversation(me(req), req.params.id);

  const rows = await ChatMessage.find({ conversation_id: req.params.id })
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    messages: rows.map((row) => serialize(row, "chat_message_id")),
  });
});

export const renameConversation = asyncHandler(async (req, res) => {
  await ownedConversation(me(req), req.params.id);

  const updated = await Conversation.findOneAndUpdate(
    { _id: req.params.id, user_id: me(req) },
    { $set: { title: req.body.title } },
    { new: true },
  ).lean();

  res.json({
    conversation: {
      id: String(updated._id),
      title: updated.title,
      lastMessageAt: updated.lastMessageAt,
    },
  });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await ownedConversation(me(req), req.params.id);

  await ChatMessage.deleteMany({ conversation_id: req.params.id });
  await Conversation.deleteOne({ _id: req.params.id, user_id: me(req) });

  res.json({ deleted: true });
});

export const confirmProposal = asyncHandler(async (req, res) => {
  const userId = me(req);
  const existing = await ownedMessage(userId, req.params.id);

  if (existing.kind !== "proposal" || !existing.proposal) {
    throw ApiError.badRequest("That message is not a proposal.");
  }

  if (existing.proposal.status === "confirmed") {
    res.json({
      status: "confirmed",
      transaction_id: String(existing.proposal.transaction_id),
      already: true,
    });
    return;
  }

  if (existing.proposal.status === "cancelled") {
    throw ApiError.badRequest("That proposal was cancelled.");
  }

  const categoryId = existing.proposal.category_id ?? req.body?.category_id;
  if (!categoryId) {
    throw ApiError.badRequest("Choose a category before saving this expense.");
  }

  const transaction = await createTransaction(userId, {
    category_id: String(categoryId),
    type: "expense",
    amount: existing.proposal.amount,
    description: existing.proposal.description ?? "",
    date: existing.proposal.date,
  });

  const updated = await ChatMessage.findOneAndUpdate(
    { _id: existing._id, "proposal.status": "pending" },
    {
      $set: {
        "proposal.status": "confirmed",
        "proposal.transaction_id": transaction.transaction_id,
        "proposal.category_id": transaction.category_id,
      },
    },
    { new: true },
  ).lean();

  res.json({
    status: "confirmed",
    transaction: serialize(transaction, "transaction_id"),
    message: serialize(updated, "chat_message_id"),
    already: false,
  });
});

export const cancelProposal = asyncHandler(async (req, res) => {
  const existing = await ownedMessage(me(req), req.params.id);

  if (existing.kind !== "proposal" || !existing.proposal) {
    throw ApiError.badRequest("That message is not a proposal.");
  }

  if (existing.proposal.status === "confirmed") {
    throw ApiError.badRequest("That expense was already saved.");
  }

  const wasCancelled = existing.proposal.status === "cancelled";

  const updated = await ChatMessage.findOneAndUpdate(
    { _id: existing._id, "proposal.status": "pending" },
    { $set: { "proposal.status": "cancelled" } },
    { new: true },
  ).lean();

  res.json({
    status: updated.proposal.status,
    message: serialize(updated, "chat_message_id"),
    already: wasCancelled,
  });
});
