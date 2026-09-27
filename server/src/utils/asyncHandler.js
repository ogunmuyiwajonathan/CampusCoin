// Express 4 does not catch rejected promises from async handlers, so every
// async route is wrapped in this instead of repeating try/catch.
export default function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
