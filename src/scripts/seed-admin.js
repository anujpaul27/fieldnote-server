const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const config = require("../config/config");
const connectDB = require("../db/db");
const User = require("../models/user.model");
const { validateRegistration } = require("../utils/validation");

async function seedAdmin() {
  config.validateConfig();

  const input = validateRegistration(
    {
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      interests: [],
      role: "admin",
    },
    { allowRole: true },
  );

  await connectDB();
  await User.init();

  const existing = await User.exists({
    $or: [{ username: input.username }, { email: input.email }],
  });
  if (existing) {
    throw new Error("An account with ADMIN_USERNAME or ADMIN_EMAIL already exists; no changes were made.");
  }

  const password = await bcrypt.hash(input.password, 12);
  const admin = await User.create({
    username: input.username,
    email: input.email,
    password,
    interests: input.interests,
    role: "admin",
  });
  console.log(`Administrator created: ${admin.username} (${admin.email}).`);
}

if (require.main === module) {
  seedAdmin()
    .catch((error) => {
      console.error(`Could not create administrator: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = seedAdmin;
