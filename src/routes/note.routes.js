const express = require("express");
const noteController = require("../controllers/note.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();
router.use(authenticate);

router.route("/").get(asyncHandler(noteController.listMyNotes)).post(asyncHandler(noteController.createNote));
router
  .route("/:noteId")
  .get(asyncHandler(noteController.getNote))
  .patch(asyncHandler(noteController.updateNote))
  .delete(asyncHandler(noteController.deleteNote));

module.exports = router;
