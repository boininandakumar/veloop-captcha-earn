// Not strictly required since express-async-errors is loaded globally,
// but kept for explicitness / readability in controllers.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
