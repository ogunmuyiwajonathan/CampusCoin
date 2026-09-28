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

// .lean() hands back raw BSON, which bypasses both the virtual and the toJSON
// transform, so a lean row would serialise as _id and break the client contract
// the virtual exists to provide. Every list endpoint maps its rows through here
// instead of dropping .lean(), which keeps the read cheap and the shape right.
export function serialize(row, idName) {
  if (!row) return row;
  const { _id, __v, ...rest } = row;
  return { [idName]: _id?.toString(), ...rest };
}

export function serializeAll(rows, idName) {
  return rows.map((row) => serialize(row, idName));
}
