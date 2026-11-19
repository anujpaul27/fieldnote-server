const express = require("express");
const userController = require("../controllers/user.controller");
const noteController = require("../controllers/note.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/users/grouped-by-interest", asyncHandler(userController.usersGroupedByInterest));
router
  .route("/users")
  .get(asyncHandler(userController.listUsers))
  .post(asyncHandler(userController.createUser));
router
  .route("/users/:userId")
  .get(asyncHandler(userController.getUser))
  .patch(asyncHandler(userController.updateUser))
  .delete(asyncHandler(userController.deleteUser));
router.get("/notes", asyncHandler(noteController.listAllNotes));

module.exports = router;
