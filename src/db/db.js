const mongoose = require("mongoose");
const config = require("../config/config");

async function connectDB() {
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is required before connecting to the database.");
  }

  try {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected.");
    return mongoose.connection;
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`, { cause: error });
  }
}

module.exports = connectDB;
