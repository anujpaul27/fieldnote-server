const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Session = require("../models/session.model");
const config = require("../config/config");
const { HttpError } = require("../utils/errors");
const { toPublicUser, validateLogin, validateRegistration } = require("../utils/validation");

const REFRESH_COOKIE = "refreshToken";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const ISSUER = "fieldnote-api";
const AUDIENCE = "fieldnote-client";

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "strict",
  path: "/api/auth",
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function signAccessToken(userId, sessionId) {
  return jwt.sign(
    { type: "access", sid: String(sessionId) },
    config.jwtSecret,
    {
      subject: String(userId),
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: ACCESS_TTL,
      algorithm: "HS256",
    },
  );
}

function signRefreshToken(userId, sessionId) {
  return jwt.sign(
    { type: "refresh", sid: String(sessionId), jti: crypto.randomUUID() },
    config.jwtSecret,
    {
      subject: String(userId),
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: REFRESH_TTL,
      algorithm: "HS256",
    },
  );
}

async function issueSession(req, res, userId) {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const session = new Session({
    user: userId,
    refreshToken: "pending",
    ip: (req.ip || "unknown").slice(0, 64),
    userAgent: (req.get("user-agent") || "unknown").slice(0, 512),
    expiresAt,
  });

  const refreshToken = signRefreshToken(userId, session._id);
  session.refreshToken = hashToken(refreshToken);
  await session.save();

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TTL_MS,
  });

  return signAccessToken(userId, session._id);
}

async function register(req, res) {
  const input = validateRegistration(req.body);
  const existing = await User.exists({
    $or: [{ username: input.username }, { email: input.email }],
  });
  if (existing) throw new HttpError(409, "A user with that username or email already exists.");

  const password = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    username: input.username,
    email: input.email,
    password,
    interests: input.interests,
    role: "user",
  });

  const accessToken = await issueSession(req, res, user._id);
  return res.status(201).json({
    message: "Registration successful.",
    data: toPublicUser(user),
    accessToken,
  });
}

async function login(req, res) {
  const { filter, password } = validateLogin(req.body);
  const user = await User.findOne(filter).select("+password");
  const valid = user ? await bcrypt.compare(password, user.password) : false;
  if (!valid) throw new HttpError(401, "Invalid credentials.");

  const accessToken = await issueSession(req, res, user._id);
  return res.status(200).json({
    message: "Login successful.",
    data: toPublicUser(user),
    accessToken,
  });
}

async function refreshToken(req, res) {
  const currentToken = req.cookies?.[REFRESH_COOKIE];
  if (!currentToken) throw new HttpError(401, "Refresh token not found.");

  let payload;
  try {
    payload = jwt.verify(currentToken, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  } catch {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new HttpError(401, "Invalid or expired refresh token.");
  }

  if (
    payload.type !== "refresh" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new HttpError(401, "Invalid or expired refresh token.");
  }

  const now = new Date();
  const nextRefreshToken = signRefreshToken(payload.sub, payload.sid);
  const session = await Session.findOneAndUpdate(
    {
      _id: payload.sid,
      user: payload.sub,
      refreshToken: hashToken(currentToken),
      revoked: false,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        refreshToken: hashToken(nextRefreshToken),
        expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
      },
    },
    { new: true, runValidators: true },
  );

  if (!session) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new HttpError(403, "Session expired. Please sign in again.");
  }

  res.cookie(REFRESH_COOKIE, nextRefreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TTL_MS,
  });
  return res.status(200).json({
    message: "Access token refreshed.",
    accessToken: signAccessToken(payload.sub, payload.sid),
  });
}

async function logout(req, res) {
  const currentToken = req.cookies?.[REFRESH_COOKIE];
  if (currentToken) {
    await Session.updateOne(
      { refreshToken: hashToken(currentToken), revoked: false },
      { $set: { revoked: true } },
    );
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  return res.status(200).json({ message: "Logout successful." });
}

module.exports = { login, logout, refreshToken, register };
