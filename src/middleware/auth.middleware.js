const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Session = require("../models/session.model");
const config = require("../config/config");
const { HttpError, asyncHandler } = require("../utils/errors");

const ISSUER = "fieldnote-api";
const AUDIENCE = "fieldnote-client";

const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) throw new HttpError(401, "Authentication required.");

  let payload;
  try {
    payload = jwt.verify(match[1], config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  } catch {
    throw new HttpError(401, "Invalid or expired access token.");
  }

  if (
    payload.type !== "access" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    throw new HttpError(401, "Invalid or expired access token.");
  }

  const [user, activeSession] = await Promise.all([
    User.findById(payload.sub).select("_id username email role interests createdAt updatedAt"),
    Session.exists({
      _id: payload.sid,
      user: payload.sub,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }),
  ]);

  if (!user || !activeSession) {
    throw new HttpError(401, "Session expired. Please sign in again.");
  }

  req.user = user;
  req.sessionId = payload.sid;
  next();
});

function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new HttpError(403, "Administrator access required."));
  }
  return next();
}

module.exports = { authenticate, requireAdmin };
