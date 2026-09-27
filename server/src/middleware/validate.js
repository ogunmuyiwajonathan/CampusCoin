import ApiError from "../utils/ApiError.js";

// Pass the zod schemas for the request parts a route cares about:
//   validate({ body: schema, query: schema, params: schema })
// The parsed value replaces the raw input, so handlers never see unvalidated data.
export default function validate(schemas) {
  return (req, res, next) => {
    for (const part of ["params", "query", "body"]) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const details = {};
        for (const issue of result.error.issues) {
          const key = issue.path.join(".") || part;
          if (!(key in details)) details[key] = issue.message;
        }
        return next(ApiError.badRequest("Some fields need attention.", details));
      }

      // Express 5 makes req.query a getter, so it cannot be reassigned.
      if (part === "query") req.validatedQuery = result.data;
      else req[part] = result.data;
    }

    return next();
  };
}
