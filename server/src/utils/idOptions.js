import mongoose from "mongoose";

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

export function serialize(row, idName) {
  if (!row) return row;
  const { _id, __v, ...rest } = row;
  return { [idName]: _id?.toString(), ...rest };
}

export function serializeAll(rows, idName) {
  return rows.map((row) => serialize(row, idName));
}
