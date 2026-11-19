const mongoose = require("mongoose");
const app = require("./src/app");
const connectDB = require("./src/db/db");
const config = require("./src/config/config");

async function startServer() {
  config.validateConfig();
  await connectDB();

  const server = app.listen(config.port, config.host, () => {
    console.log(`API listening on ${config.host}:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing the API server.`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exitCode = 0;
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  return server;
}

if (require.main === module) {
  startServer().catch(async (error) => {
    console.error(`Server startup failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}

module.exports = startServer;
