const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    content: {
      type: String,
      required: true,
      maxlength: 50000,
    },
  },
  { timestamps: true, collection: "posts" },
);

// These support the public feed and the indexed per-user $lookup pipeline.
// _id is already indexed by MongoDB for individual-post reads.
postSchema.index({ createdAt: -1, _id: -1 }, { name: "posts_createdAt_id_desc" });
postSchema.index({ user: 1, createdAt: -1, _id: -1 }, { name: "posts_user_createdAt_id_desc" });

module.exports = mongoose.model("Post", postSchema, "posts");
