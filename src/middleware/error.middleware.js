const { HttpError } = require("../utils/errors");

function notFound(req, _res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found.`));
}

function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  let status = error.status || 500;
  let message = error.message || "Internal server error.";

  if (error.code === 11000) {
    status = 409;
    message = "A record with that username or email already exists.";
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    status = 400;
    message = error.message;
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Request body must contain valid JSON.";
  } else if (error.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large.";
  }

  if (status >= 500) {
    console.error(error);
    message = "Internal server error.";
  }

  return res.status(status).json({ message });
}

module.exports = { errorHandler, notFound };
