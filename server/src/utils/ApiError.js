export default class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (details) this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "You need to sign in to do that.") {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have access to that.") {
    return new ApiError(403, message);
  }

  static notFound(message = "Not found.") {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = "Too many attempts. Please try again later.") {
    return new ApiError(429, message);
  }
}
