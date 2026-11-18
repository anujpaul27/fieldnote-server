const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const sessionModel = require("../models/session.model");
const config = require("../config/config");

const REFRESH_COOKIE = "refreshToken";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
};

const isString = (value) => typeof value === "string";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (userId) =>
  jwt.sign({ id: String(userId) }, config.JWT_SECRET, { expiresIn: "15m" });

const signRefreshToken = (userId) =>
  jwt.sign(
    { id: String(userId), type: "refresh", jti: crypto.randomUUID() },
    config.JWT_SECRET,
    { expiresIn: "7d" },
  );

const toPublicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
});

async function createSession(req, userId) {
  const refreshToken = signRefreshToken(userId);

  await sessionModel.create({
    user: userId,
    refreshToken: hashToken(refreshToken),
    ip: req.ip || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
  });

  return refreshToken;
}

// Creates a session, sets the refresh cookie, and returns the access token.
async function issueSession(req, res, userId) {
  const refreshToken = await createSession(req, userId);

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TTL_MS,
  });

  return signAccessToken(userId);
}

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!isString(username) || !isString(email) || !isString(password)) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required." });
    }

    const exists = await userModel.exists({
      $or: [{ username }, { email }],
    });

    if (exists) {
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
    });

    const accessToken = await issueSession(req, res, user._id);

    return res.status(201).json({
      message: "User Registration Successful.",
      data: toPublicUser(user),
      accessToken,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "User already exists." });
    }
    console.error(err);
    return res.status(500).json({ message: "Registration failed." });
  }
}

async function logIn(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!isString(password) || (!isString(username) && !isString(email))) {
      return res
        .status(400)
        .json({ message: "Username or email, and password are required." });
    }

    const filter = isString(username) ? { username } : { email };
    const user = await userModel.findOne(filter);

    const valid = user && (await bcrypt.compare(password, user.password));

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const accessToken = await issueSession(req, res, user._id);

    return res.status(200).json({
      message: "Login Successful.",
      data: toPublicUser(user),
      accessToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Login failed." });
  }
}

async function refreshToken(req, res) {
  try {
    const currentToken = req.cookies[REFRESH_COOKIE];

    if (!currentToken) {
      return res.status(401).json({ message: "Refresh token not found." });
    }

    let payload;
    try {
      payload = jwt.verify(currentToken, config.JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token." });
    }

    if (payload.type !== "refresh") {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token." });
    }

    const session = await sessionModel.findOne({
      refreshToken: hashToken(currentToken),
      revoked: false,
    });

    if (!session) {
      return res.status(403).json({ message: "Session expired." });
    }

    // Rotate the refresh token so each one can only be used once.
    const newRefreshToken = signRefreshToken(payload.id);
    session.refreshToken = hashToken(newRefreshToken);
    await session.save();

    res.cookie(REFRESH_COOKIE, newRefreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TTL_MS,
    });

    return res.status(200).json({
      message: "Access Token Refreshed.",
      accessToken: signAccessToken(payload.id),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Token refresh failed." });
  }
}

async function logOut(req, res) {
  try {
    const currentToken = req.cookies[REFRESH_COOKIE];

    if (currentToken) {
      await sessionModel.updateOne(
        { refreshToken: hashToken(currentToken), revoked: false },
        { $set: { revoked: true } },
      );
    }

    res.clearCookie(REFRESH_COOKIE, cookieOptions);

    return res.status(200).json({ message: "Logout Successful." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Logout failed." });
  }
}

module.exports = { register, logIn, refreshToken, logOut };
