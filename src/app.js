const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoose = require("mongoose");
const config = require("./config/config");
const authRouter = require("./routes/auth.routes");
const userRouter = require("./routes/user.routes");
const noteRouter = require("./routes/note.routes");
const postRouter = require("./routes/post.routes");
const adminRouter = require("./routes/admin.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "128kb" }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/notes", noteRouter);
app.use("/api/posts", postRouter);
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
