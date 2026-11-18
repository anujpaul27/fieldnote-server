const express = require("express");
const authRouter = express.Router();
const authController = require("../controllers/auth.controler");

// POST /api/auth/register
authRouter.post("/register", authController.register);

// POST /api/auth/login
authRouter.post("/login", authController.logIn);

// POST /api/auth/refresh-token
authRouter.post("/refresh-token", authController.refreshToken);

// POST /api/auth/logout
authRouter.post("/logout", authController.logOut);

module.exports = authRouter;
