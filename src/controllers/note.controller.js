const Note = require("../models/note.model");
const { HttpError } = require("../utils/errors");
const {
  paginationMeta,
  parsePagination,
  validateId,
  validateNoteInput,
} = require("../utils/validation");

async function createNote(req, res) {
  const input = validateNoteInput(req.body);
  const note = await Note.create({ ...input, user: req.user._id });
  return res.status(201).json({ data: note });
}

async function listMyNotes(req, res) {
  const pagination = parsePagination(req.query);
  const filter = { user: req.user._id };
  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Note.countDocuments(filter),
  ]);

  return res.json({ data: notes, pagination: paginationMeta(pagination, total) });
}

async function getNote(req, res) {
  const noteId = validateId(req.params.noteId, "Note ID");
  const filter = { _id: noteId };
  if (req.user.role !== "admin") filter.user = req.user._id;

  const note = await Note.findOne(filter).lean();
  if (!note) throw new HttpError(404, "Note not found.");
  return res.json({ data: note });
}

async function updateNote(req, res) {
  const noteId = validateId(req.params.noteId, "Note ID");
  const input = validateNoteInput(req.body, { partial: true });
  const note = await Note.findOneAndUpdate(
    { _id: noteId, user: req.user._id },
    { $set: input },
    { new: true, runValidators: true },
  ).lean();
  if (!note) throw new HttpError(404, "Note not found.");
  return res.json({ data: note });
}

async function deleteNote(req, res) {
  const noteId = validateId(req.params.noteId, "Note ID");
  const result = await Note.deleteOne({ _id: noteId, user: req.user._id });
  if (result.deletedCount === 0) throw new HttpError(404, "Note not found.");
  return res.status(200).json({ message: "Note deleted." });
}

async function listAllNotes(req, res) {
  const pagination = parsePagination(req.query);
  const [notes, total] = await Promise.all([
    Note.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Note.countDocuments(),
  ]);

  return res.json({ data: notes, pagination: paginationMeta(pagination, total) });
}

module.exports = { createNote, deleteNote, getNote, listAllNotes, listMyNotes, updateNote };
