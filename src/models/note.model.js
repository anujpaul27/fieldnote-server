const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
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
      default: "",
      maxlength: 50000,
    },
  },
  { timestamps: true, collection: "notes" },
);

// The first index serves a user's newest-first list; the second serves the
// admin's all-notes list. _id provides the index for individual-note reads.
noteSchema.index({ user: 1, createdAt: -1, _id: -1 }, { name: "notes_user_createdAt_id_desc" });
noteSchema.index({ createdAt: -1, _id: -1 }, { name: "notes_createdAt_id_desc" });

module.exports = mongoose.model("Note", noteSchema, "notes");
