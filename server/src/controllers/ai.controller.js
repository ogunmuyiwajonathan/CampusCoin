import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ChatMessage, Conversation } from "../models/index.js";
import { serialize } from "../utils/idOptions.js";
import { createTransaction } from "../services/ledger.service.js";
import * as ai from "../services/ai.service.js";

const me = (req) => req.user._id;

/** A draft the student has not acted on within a day is no longer fresh. */
export const PROPOSAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function proposalIsExpired(message) {
  const created = new Date(message.createdAt ?? Date.now()).getTime();
  return Number.isFinite(created) && Date.now() - created > PROPOSAL_MAX_AGE_MS;
}

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

/**
 * Only one draft in a conversation may be live at a time: when a new proposal
 * arrives, the previous pending one is marked superseded so the student can
 * never hold two Confirm buttons.
 */
async function supersedePendingProposals(conversationId, keepId = null) {
  const filter = {
    conversation_id: conversationId,
    "proposal.status": "pending",
  };
  if (keepId) filter._id = { $ne: keepId };
  await ChatMessage.updateMany(filter, { $set: { "proposal.status": "superseded" } });
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
          type: result.proposal.type ?? "expense",
          amount: result.proposal.amount,
          description: result.proposal.description,
          category_id: result.proposal.category_id,
          category_name: result.proposal.category_name,
          date: result.proposal.date,
          status: "pending",
        }
      : null,
  });

  if (result.proposal) {
    await supersedePendingProposals(conversation._id, assistantMessage._id);
  }

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
    // Idempotent: hand back the stored proposal so the client renders the
    // saved card instead of falling back to a stale pending one.
    const current = await ChatMessage.findById(existing._id).lean();
    res.json({
      status: "confirmed",
      transaction_id: String(current.proposal.transaction_id ?? ""),
      message: serialize(current, "chat_message_id"),
      already: true,
    });
    return;
  }

  if (existing.proposal.status === "cancelled") {
    throw ApiError.badRequest("That proposal was cancelled.");
  }

  if (existing.proposal.status === "superseded") {
    throw ApiError.badRequest("That draft was replaced by a newer one.");
  }

  if (existing.proposal.status === "expired" || proposalIsExpired(existing)) {
    if (existing.proposal.status === "pending") {
      await ChatMessage.updateOne(
        { _id: existing._id, "proposal.status": "pending" },
        { $set: { "proposal.status": "expired" } },
      );
    }
    throw ApiError.badRequest("That draft expired. Create it again.");
  }

  const categoryId = existing.proposal.category_id ?? req.body?.category_id;
  if (!categoryId) {
    throw ApiError.badRequest("Choose a category before saving this entry.");
  }

  const amount = Number(existing.proposal.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw ApiError.badRequest("That draft has no valid amount.");
  }

  // request_id keys the transaction on the proposal id, so a double click or a
  // retried request can only ever produce one row (see the unique index on
  // user_id + request_id).
  const transaction = await createTransaction(userId, {
    category_id: String(categoryId),
    type: existing.proposal.type ?? "expense",
    amount,
    description: existing.proposal.description ?? "",
    date: existing.proposal.date,
    request_id: `ai-proposal:${String(existing._id)}`,
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

  if (!updated) {
    // A concurrent confirm won the status flip; the transaction above is
    // already the same row, so report it as already saved.
    const current = await ChatMessage.findById(existing._id).lean();
    res.json({
      status: "confirmed",
      transaction_id: String(transaction.transaction_id),
      message: serialize(current, "chat_message_id"),
      already: true,
    });
    return;
  }

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
    throw ApiError.badRequest("That entry was already saved.");
  }

  if (existing.proposal.status === "superseded" || existing.proposal.status === "expired") {
    res.json({
      status: existing.proposal.status,
      message: serialize(existing, "chat_message_id"),
      already: true,
    });
    return;
  }

  const wasCancelled = existing.proposal.status === "cancelled";

  const updated = await ChatMessage.findOneAndUpdate(
    { _id: existing._id, "proposal.status": "pending" },
    { $set: { "proposal.status": "cancelled" } },
    { new: true },
  ).lean();

  res.json({
    status: updated?.proposal?.status ?? "cancelled",
    message: serialize(updated ?? existing, "chat_message_id"),
    already: wasCancelled,
  });
});

/**
 * "Create it again" for a draft that went stale: a fresh pending proposal with
 * the same details, and the old one stepped aside so only one is live.
 */
export const recreateProposal = asyncHandler(async (req, res) => {
  const userId = me(req);
  const source = await ownedMessage(userId, req.params.id);

  if (source.kind !== "proposal" || !source.proposal) {
    throw ApiError.badRequest("That message is not a proposal.");
  }
  if (source.proposal.status === "confirmed") {
    throw ApiError.badRequest("That entry was already saved.");
  }

  const original = source.proposal;
  const created = await ChatMessage.create({
    conversation_id: source.conversation_id,
    role: "assistant",
    content: "",
    kind: "proposal",
    proposal: {
      type: original.type ?? "expense",
      amount: original.amount,
      description: original.description ?? "",
      category_id: original.category_id ?? null,
      category_name: original.category_name ?? null,
      date: original.date,
      status: "pending",
    },
  });

  await supersedePendingProposals(source.conversation_id, created._id);

  // The draft that was just rebuilt must stop offering "Create it again", so a
  // student can never end up with two live drafts from one card.
  if (["pending", "expired"].includes(source.proposal.status)) {
    await ChatMessage.updateOne(
      { _id: source._id, "proposal.status": source.proposal.status },
      { $set: { "proposal.status": "superseded" } },
    );
  }

  res.status(201).json({
    message: serialize(created.toObject ? created.toObject() : created, "chat_message_id"),
    replaced: String(source._id),
  });
});
