const mongoose = require("mongoose");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const { HttpError } = require("../utils/errors");
const {
  paginationMeta,
  parsePagination,
  validateId,
  validateNoteInput,
} = require("../utils/validation");
const { buildUserPostsLookupPipeline } = require("../queries/aggregation");

function validatePostInput(body, options) {
  const input = validateNoteInput(body, options);
  if (Object.hasOwn(input, "content") && input.content.trim().length === 0) {
    throw new HttpError(400, "Post content cannot be empty.");
  }
  return input;
}

async function createPost(req, res) {
  const input = validatePostInput(req.body);
  const post = await Post.create({ ...input, user: req.user._id });
  return res.status(201).json({ data: post });
}

async function listPosts(req, res) {
  const pagination = parsePagination(req.query);
  const [posts, total] = await Promise.all([
    Post.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Post.countDocuments(),
  ]);
  return res.json({ data: posts, pagination: paginationMeta(pagination, total) });
}

async function getPost(req, res) {
  const postId = validateId(req.params.postId, "Post ID");
  const post = await Post.findById(postId).lean();
  if (!post) throw new HttpError(404, "Post not found.");
  return res.json({ data: post });
}

async function updatePost(req, res) {
  const postId = validateId(req.params.postId, "Post ID");
  const input = validatePostInput(req.body, { partial: true });
  const post = await Post.findOneAndUpdate(
    { _id: postId, user: req.user._id },
    { $set: input },
    { new: true, runValidators: true },
  ).lean();
  if (!post) throw new HttpError(404, "Post not found.");
  return res.json({ data: post });
}

async function deletePost(req, res) {
  const postId = validateId(req.params.postId, "Post ID");
  const result = await Post.deleteOne({ _id: postId, user: req.user._id });
  if (result.deletedCount === 0) throw new HttpError(404, "Post not found.");
  return res.status(200).json({ message: "Post deleted." });
}

async function listPostsByUser(req, res) {
  const userId = validateId(req.params.userId, "User ID");
  const pagination = parsePagination(req.query);

  // A single User.aggregate call combines the indexed profile match with the
  // Posts lookup; the lookup's facet paginates results and calculates its total.
  const [result] = await User.aggregate(
    buildUserPostsLookupPipeline({
      userId: new mongoose.Types.ObjectId(userId),
      skip: pagination.skip,
      limit: pagination.limit,
      postsCollection: Post.collection.name,
    }),
  );

  if (!result) throw new HttpError(404, "User not found.");
  return res.json({
    data: { userId: String(result._id), posts: result.posts || [] },
    pagination: paginationMeta(pagination, result.total || 0),
  });
}

module.exports = { createPost, deletePost, getPost, listPosts, listPostsByUser, updatePost };
