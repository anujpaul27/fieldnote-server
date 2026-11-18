const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/auth.routes");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/auth", authRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

module.exports = app;
