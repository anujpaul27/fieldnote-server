const express = require("express");
const postController = require("../controllers/post.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();

router.get("/", asyncHandler(postController.listPosts));
router.get("/:postId", asyncHandler(postController.getPost));
router.post("/", authenticate, asyncHandler(postController.createPost));
router.patch("/:postId", authenticate, asyncHandler(postController.updatePost));
router.delete("/:postId", authenticate, asyncHandler(postController.deletePost));

module.exports = router;
