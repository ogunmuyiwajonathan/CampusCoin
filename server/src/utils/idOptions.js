// Every model exposes its Mongo _id under the snake_case name the client
// already uses (category_id, transaction_id, ...), so the API contract is
// identical to data/mockData.js and swapping the client store is a transport
// change rather than a rename. The raw _id is dropped from JSON output and
// __v is never sent, because neither appears in the client contract.
export function idOptions(idName) {
  return {
    id: idName,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  };
}
