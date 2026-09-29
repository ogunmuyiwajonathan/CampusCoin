import ApiError from "../utils/ApiError.js";

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

      if (part === "query") req.validatedQuery = result.data;
      else req[part] = result.data;
    }

    return next();
  };
}
