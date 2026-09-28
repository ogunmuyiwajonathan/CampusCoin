import mongoose from "mongoose";

// Every model exposes its Mongo _id under the snake_case name the client already
// uses (category_id, transaction_id, ...), so the API contract is identical to
// data/mockData.js and the client swap in S4 is a transport change rather than a
// rename. The raw _id is dropped from JSON and __v is never sent, because
// neither appears in the client contract.
//
// This exists as a factory rather than a plain options object because Mongoose's
// `id` schema option always names its virtual "id", even when handed a string
// like "user_id". Declaring the virtual by hand is the only way to get the name
// we actually need, and a silently missing id is the kind of bug that makes
// every session resolve to userId: undefined.
export function defineSchema(idName, definition, options = {}) {
  const schema = new mongoose.Schema(definition, {
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
    ...options,
  });

  schema.virtual(idName).get(function getId() {
    return this._id.toString();
  });

  return schema;
}
