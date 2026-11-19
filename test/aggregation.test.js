const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  buildInterestGroupsPipeline,
  buildUserPostsLookupPipeline,
} = require("../src/queries/aggregation");

test("interest grouping is one paginated aggregation pipeline", () => {
  const pipeline = buildInterestGroupsPipeline({ skip: 20, limit: 10 });
  assert.equal(pipeline[0].$match.interests.$type, "string");
  assert.equal(pipeline[1].$unwind, "$interests");
  assert.ok(pipeline.some((stage) => stage.$group));
  assert.deepEqual(pipeline.find((stage) => stage.$facet).$facet.data.slice(0, 2), [
    { $skip: 20 },
    { $limit: 10 },
  ]);
});

test("user posts pipeline performs a paginated indexed $lookup", () => {
  const id = { _bsontype: "ObjectId", toString: () => "user-id" };
  const pipeline = buildUserPostsLookupPipeline({
    userId: id,
    skip: 10,
    limit: 5,
    postsCollection: "posts",
  });
  const lookup = pipeline.find((stage) => stage.$lookup).$lookup;
  assert.equal(pipeline[0].$match._id, id);
  assert.equal(lookup.from, "posts");
  assert.equal(lookup.let.requestedUserId, "$_id");
  assert.deepEqual(lookup.pipeline[0].$match.$expr.$eq, ["$user", "$$requestedUserId"]);
  assert.deepEqual(lookup.pipeline[1].$sort, { createdAt: -1, _id: -1 });
  assert.deepEqual(lookup.pipeline[2].$facet.data.slice(0, 2), [
    { $skip: 10 },
    { $limit: 5 },
  ]);
});
