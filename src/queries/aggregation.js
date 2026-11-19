function buildInterestGroupsPipeline({ skip, limit }) {
  return [
    // The multikey interests index supports this selector before documents are unwound.
    { $match: { interests: { $type: "string" } } },
    { $unwind: "$interests" },
    {
      $group: {
        _id: "$interests",
        users: {
          $addToSet: {
            id: "$_id",
            username: "$username",
            email: "$email",
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: { _id: 0, interest: "$_id", users: 1 } },
        ],
        metadata: [{ $count: "total" }],
      },
    },
    {
      $project: {
        _id: 0,
        data: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0] },
      },
    },
  ];
}

function buildUserPostsLookupPipeline({ userId, skip, limit, postsCollection }) {
  return [
    // The built-in _id index selects the requested profile.
    { $match: { _id: userId } },
    {
      $lookup: {
        from: postsCollection,
        let: { requestedUserId: "$_id" },
        pipeline: [
          // $expr compares the indexed foreign key with a per-user constant;
          // the posts { user, createdAt, _id } index supports lookup and sorting.
          { $match: { $expr: { $eq: ["$user", "$$requestedUserId"] } } },
          { $sort: { createdAt: -1, _id: -1 } },
          {
            $facet: {
              data: [
                { $skip: skip },
                { $limit: limit },
                {
                  $project: {
                    _id: 1,
                    user: 1,
                    title: 1,
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                  },
                },
              ],
              metadata: [{ $count: "total" }],
            },
          },
          {
            $project: {
              _id: 0,
              data: 1,
              total: { $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0] },
            },
          },
        ],
        as: "postPage",
      },
    },
    {
      $project: {
        _id: 1,
        posts: { $ifNull: [{ $arrayElemAt: ["$postPage.data", 0] }, []] },
        total: { $ifNull: [{ $arrayElemAt: ["$postPage.total", 0] }, 0] },
      },
    },
  ];
}

module.exports = { buildInterestGroupsPipeline, buildUserPostsLookupPipeline };
