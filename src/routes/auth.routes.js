const express = require("express");
const authController = require("../controllers/auth.controller");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/refresh-token", asyncHandler(authController.refreshToken));
router.post("/logout", asyncHandler(authController.logout));

module.exports = router;
