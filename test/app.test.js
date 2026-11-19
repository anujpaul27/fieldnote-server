const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/app");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("API exposes a health response and JSON 404 handling", async (context) => {
  const server = http.createServer(app);
  const port = await listen(server);
  context.after(() => close(server));

  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 503, "health is unavailable until MongoDB is connected");
  assert.deepEqual(await health.json(), { status: "unavailable", database: "disconnected" });

  const protectedRoute = await fetch(`http://127.0.0.1:${port}/api/notes`);
  assert.equal(protectedRoute.status, 401);

  const invalidUserId = await fetch(`http://127.0.0.1:${port}/api/users/not-an-id/posts`);
  assert.equal(invalidUserId.status, 400);

  const missing = await fetch(`http://127.0.0.1:${port}/not-a-route`);
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).message, /not found/i);
});
