require("dotenv").config({ quiet: true });

const port = Number(process.env.PORT || 5000);
const clientOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const config = {
  port,
  host: process.env.HOST || "0.0.0.0",
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigins,
};

function validateConfig() {
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is required. Set it in your environment or .env file.");
  }

  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is required. Set it in your environment or .env file.");
  }

  if (Buffer.byteLength(config.jwtSecret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be at least 32 bytes long.");
  }

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return config;
}

module.exports = { ...config, validateConfig };
