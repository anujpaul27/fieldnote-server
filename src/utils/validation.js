const mongoose = require("mongoose");
const { HttpError } = require("./errors");

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
const MAX_INTERESTS = 50;
const MAX_INTEREST_LENGTH = 40;
const MAX_TITLE_LENGTH = 160;
const MAX_CONTENT_LENGTH = 50000;

function requireObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "A JSON object is required.");
  }
  return body;
}

function normalizeUsername(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "Username is required.");
  }

  const username = value.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(
      400,
      "Username must be 3–30 characters and contain only letters, numbers, dots, underscores or hyphens.",
    );
  }
  return username;
}

function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "Email is required.");
  }

  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "A valid email address is required.");
  }
  return email;
}

function validatePassword(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "Password is required.");
  }

  if (Array.from(value).length < PASSWORD_MIN_LENGTH) {
    throw new HttpError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }

  if (Buffer.byteLength(value, "utf8") > PASSWORD_MAX_BYTES) {
    throw new HttpError(400, `Password must not exceed ${PASSWORD_MAX_BYTES} UTF-8 bytes.`);
  }
  return value;
}

function normalizeInterests(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_INTERESTS) {
    throw new HttpError(400, `Interests must be an array of no more than ${MAX_INTERESTS} items.`);
  }

  const interests = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string") {
      throw new HttpError(400, "Each interest must be a string.");
    }
    const interest = item.trim().toLowerCase();
    if (!interest) continue;
    if (interest.length > MAX_INTEREST_LENGTH) {
      throw new HttpError(400, `Each interest must be ${MAX_INTEREST_LENGTH} characters or fewer.`);
    }
    if (!seen.has(interest)) {
      seen.add(interest);
      interests.push(interest);
    }
  }
  return interests;
}

function validateRegistration(body, { allowRole = false } = {}) {
  const input = requireObjectBody(body);
  const result = {
    username: normalizeUsername(input.username),
    email: normalizeEmail(input.email),
    password: validatePassword(input.password),
    interests: normalizeInterests(input.interests),
  };

  if (allowRole && input.role !== undefined) {
    result.role = normalizeRole(input.role);
  }
  return result;
}

function validateLogin(body) {
  const input = requireObjectBody(body);
  const password = validatePasswordForLogin(input.password);
  const hasUsername = typeof input.username === "string" && input.username.trim() !== "";
  const hasEmail = typeof input.email === "string" && input.email.trim() !== "";

  if (hasUsername === hasEmail) {
    throw new HttpError(400, "Provide exactly one of username or email, along with password.");
  }

  return {
    filter: hasEmail
      ? { email: normalizeEmail(input.email) }
      : { username: normalizeUsername(input.username) },
    password,
  };
}

function validatePasswordForLogin(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, "Password is required.");
  }
  if (Buffer.byteLength(value, "utf8") > PASSWORD_MAX_BYTES) {
    throw new HttpError(400, `Password must not exceed ${PASSWORD_MAX_BYTES} UTF-8 bytes.`);
  }
  return value;
}

function normalizeRole(value) {
  if (value !== "user" && value !== "admin") {
    throw new HttpError(400, "Role must be either 'user' or 'admin'.");
  }
  return value;
}

function validateProfileUpdate(body, { allowRole = false } = {}) {
  const input = requireObjectBody(body);
  const result = {};

  if (Object.hasOwn(input, "username")) result.username = normalizeUsername(input.username);
  if (Object.hasOwn(input, "email")) result.email = normalizeEmail(input.email);
  if (Object.hasOwn(input, "interests")) result.interests = normalizeInterests(input.interests);
  if (allowRole && Object.hasOwn(input, "role")) result.role = normalizeRole(input.role);

  if (Object.keys(result).length === 0) {
    throw new HttpError(400, "Provide at least one supported field to update.");
  }
  return result;
}

function validateNoteInput(body, { partial = false } = {}) {
  const input = requireObjectBody(body);
  const result = {};

  if (!partial || Object.hasOwn(input, "title")) {
    if (typeof input.title !== "string") {
      throw new HttpError(400, "Title is required and must be a string.");
    }
    const title = input.title.trim();
    if (!title || title.length > MAX_TITLE_LENGTH) {
      throw new HttpError(400, `Title must be between 1 and ${MAX_TITLE_LENGTH} characters.`);
    }
    result.title = title;
  }

  if (!partial || Object.hasOwn(input, "content")) {
    if (typeof input.content !== "string") {
      throw new HttpError(400, "Content is required and must be a string.");
    }
    if (input.content.length > MAX_CONTENT_LENGTH) {
      throw new HttpError(400, `Content must be ${MAX_CONTENT_LENGTH} characters or fewer.`);
    }
    result.content = input.content;
  }

  if (partial && Object.keys(result).length === 0) {
    throw new HttpError(400, "Provide a title or content to update.");
  }
  return result;
}

function validateId(value, label = "ID") {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new HttpError(400, `${label} must be a valid ID.`);
  }
  return value;
}

function parsePagination(query = {}) {
  const parse = (value, fallback, name) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      throw new HttpError(400, `${name} must be a positive integer.`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new HttpError(400, `${name} must be a positive integer.`);
    }
    return parsed;
  };

  const page = parse(query.page, 1, "page");
  const limit = parse(query.limit, 20, "limit");
  if (limit > 100) throw new HttpError(400, "limit must be 100 or less.");

  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) {
    throw new HttpError(400, "page is too large.");
  }
  return { page, limit, skip };
}

function paginationMeta({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function toPublicUser(user) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    interests: user.interests || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeInterests,
  normalizeRole,
  paginationMeta,
  parsePagination,
  requireObjectBody,
  toPublicUser,
  validateId,
  validateLogin,
  validateNoteInput,
  validateProfileUpdate,
  validateRegistration,
};
