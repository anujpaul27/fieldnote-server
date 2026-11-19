const express = require("express");
const userController = require("../controllers/user.controller");
const postController = require("../controllers/post.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();

router.get("/me", authenticate, asyncHandler(userController.getMyProfile));
router.patch("/me", authenticate, asyncHandler(userController.updateMyProfile));

// Public: posts are readable by everyone. This endpoint uses one User.aggregate
// call with a $lookup into the posts collection.
router.get("/:userId/posts", asyncHandler(postController.listPostsByUser));

module.exports = router;
