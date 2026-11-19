const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required."],
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    interests: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "users",
    toJSON: {
      transform(_document, value) {
        delete value.password;
        delete value.__v;
        return value;
      },
    },
  },
);

// These indexes enforce account uniqueness and support the admin list and
// the interest-group aggregation. MongoDB's built-in _id index serves profile reads.
userSchema.index({ username: 1 }, { unique: true, name: "users_username_unique" });
userSchema.index({ email: 1 }, { unique: true, name: "users_email_unique" });
userSchema.index({ createdAt: -1, _id: -1 }, { name: "users_createdAt_id_desc" });
userSchema.index({ interests: 1 }, { name: "users_interests" });

module.exports = mongoose.model("User", userSchema, "users");
