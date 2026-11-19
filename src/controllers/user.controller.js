const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Note = require("../models/note.model");
const Post = require("../models/post.model");
const Session = require("../models/session.model");
const { HttpError } = require("../utils/errors");
const {
  paginationMeta,
  parsePagination,
  toPublicUser,
  validateId,
  validateProfileUpdate,
  validateRegistration,
} = require("../utils/validation");
const { buildInterestGroupsPipeline } = require("../queries/aggregation");

async function getMyProfile(req, res) {
  return res.json({ data: toPublicUser(req.user) });
}

async function updateMyProfile(req, res) {
  const input = validateProfileUpdate(req.body);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!user) throw new HttpError(404, "User not found.");
  return res.json({ data: toPublicUser(user) });
}

async function listUsers(req, res) {
  const pagination = parsePagination(req.query);
  const [users, total] = await Promise.all([
    User.find()
      .select("_id username email role interests createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    User.countDocuments(),
  ]);

  return res.json({
    data: users.map(toPublicUser),
    pagination: paginationMeta(pagination, total),
  });
}

async function getUser(req, res) {
  const userId = validateId(req.params.userId, "User ID");
  const user = await User.findById(userId)
    .select("_id username email role interests createdAt updatedAt")
    .lean();
  if (!user) throw new HttpError(404, "User not found.");
  return res.json({ data: toPublicUser(user) });
}

async function createUser(req, res) {
  const input = validateRegistration(req.body, { allowRole: true });
  const password = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    username: input.username,
    email: input.email,
    password,
    interests: input.interests,
    role: input.role || "user",
  });
  return res.status(201).json({ data: toPublicUser(user) });
}

async function updateUser(req, res) {
  const userId = validateId(req.params.userId, "User ID");
  const input = validateProfileUpdate(req.body, { allowRole: true });

  if (
    String(userId) === String(req.user._id) &&
    input.role !== undefined &&
    input.role !== "admin"
  ) {
    throw new HttpError(409, "You cannot remove your own administrator access.");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!user) throw new HttpError(404, "User not found.");
  return res.json({ data: toPublicUser(user) });
}

async function deleteUser(req, res) {
  const userId = validateId(req.params.userId, "User ID");
  if (String(userId) === String(req.user._id)) {
    throw new HttpError(409, "You cannot delete your own administrator account.");
  }

  const result = await User.deleteOne({ _id: userId });
  if (result.deletedCount === 0) throw new HttpError(404, "User not found.");

  // Remove private data and sessions when an account is removed.
  await Promise.all([
    Note.deleteMany({ user: userId }),
    Post.deleteMany({ user: userId }),
    Session.deleteMany({ user: userId }),
  ]);

  return res.status(200).json({ message: "User and associated data deleted." });
}

async function usersGroupedByInterest(req, res) {
  const pagination = parsePagination(req.query);
  // Keep this as one aggregate call: its $facet provides both the page and total.
  const [result] = await User.aggregate(
    buildInterestGroupsPipeline(pagination),
  );
  const data = result?.data || [];
  const total = result?.total || 0;
  return res.json({ data, pagination: paginationMeta(pagination, total) });
}

module.exports = {
  createUser,
  deleteUser,
  getMyProfile,
  getUser,
  listUsers,
  updateMyProfile,
  updateUser,
  usersGroupedByInterest,
};
