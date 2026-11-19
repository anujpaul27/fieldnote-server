const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parsePagination,
  validateLogin,
  validateProfileUpdate,
  validateRegistration,
  validateNoteInput,
} = require("../src/utils/validation");

function assertHttpError(fn, status = 400) {
  assert.throws(fn, (error) => error.status === status);
}

test("registration normalizes identity fields and interests", () => {
  const result = validateRegistration({
    username: "  Alice.Example ",
    email: "  Alice@Example.com ",
    password: "a strong pass",
    interests: [" Chess ", "reading", "chess", ""],
    role: "admin",
  });

  assert.deepEqual(result, {
    username: "alice.example",
    email: "alice@example.com",
    password: "a strong pass",
    interests: ["chess", "reading"],
  });
  assert.equal(Object.hasOwn(result, "role"), false, "public registration cannot set a role");
});

test("admin user creation can accept only a supported role", () => {
  const result = validateRegistration(
    {
      username: "admin-user",
      email: "admin@example.com",
      password: "another pass",
      role: "admin",
    },
    { allowRole: true },
  );
  assert.equal(result.role, "admin");
  assertHttpError(() =>
    validateRegistration(
      {
        username: "admin-user",
        email: "admin@example.com",
        password: "another pass",
        role: "owner",
      },
      { allowRole: true },
    ),
  );
});

test("login requires exactly one normalized username or email", () => {
  assert.deepEqual(validateLogin({ email: " USER@Example.com ", password: "secret123" }), {
    filter: { email: "user@example.com" },
    password: "secret123",
  });
  assertHttpError(() => validateLogin({ username: "alice", email: "a@example.com", password: "secret123" }));
  assertHttpError(() => validateLogin({ email: "bad", password: "secret123" }));
});

test("profile updates accept only explicitly supported fields", () => {
  assert.deepEqual(validateProfileUpdate({ interests: ["music"], role: "admin" }), {
    interests: ["music"],
  });
  assertHttpError(() => validateProfileUpdate({ role: "admin" }));
  assertHttpError(() => validateProfileUpdate({ username: "x" }));
});

test("note input is bounded and partial updates require at least one field", () => {
  assert.deepEqual(validateNoteInput({ title: " Note ", content: "body" }), {
    title: "Note",
    content: "body",
  });
  assert.deepEqual(validateNoteInput({ content: "updated" }, { partial: true }), {
    content: "updated",
  });
  assertHttpError(() => validateNoteInput({ title: "  ", content: "body" }));
  assertHttpError(() => validateNoteInput({}, { partial: true }));
});

test("pagination defaults and bounds are enforced", () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(parsePagination({ page: "3", limit: "5" }), { page: 3, limit: 5, skip: 10 });
  assertHttpError(() => parsePagination({ page: "0" }));
  assertHttpError(() => parsePagination({ limit: "101" }));
  assertHttpError(() => parsePagination({ page: "1.5" }));
});
