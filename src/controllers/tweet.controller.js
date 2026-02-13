import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  try {
    const content = req.body;
    if (!content) {
      throw new ApiError(404, "Content is Required");
    }
    const tweet = await Tweet.create({
      content,
      owner: req.user._id,
    });
    if (!tweet) {
      throw new ApiError(404, "Error while Creating tweet");
    }

    return res.status(200).json(
        new ApiResponse(200,tweet,"Tweet Created Successfully")
    )

  } catch (error) {
    throw new ApiError(500, "createTweet:Database error");
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const userId = req.user._id;
  const usertweets = await Tweet.aggregate([
    {
      $match: { owner: mongoose.Types.ObjectId(userId) },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $lookup: {
        from: "users",
        as: "userDetails",
        localField: "owner",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        userDetails: { $first: "$userDetails" },
      },
    },
  ]);
  if (!usertweets.length) {
    throw new ApiError(404, "No Tweets found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, usertweets, "Tweets Fetched Successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  try {
    const { content } = req.body;
    if (!content) {
      throw new ApiError(404, "Content is Required to update tweet");
    }
    const { tweetid } = req.params;
    if (!tweetid) {
      throw new ApiError(404, "Invalid Tweet Id");
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetid,
      {
        $set: {
          content: content,
        },
      },
      { new: true }
    );
  
    return res.status(200).json(
      new ApiResponse(200,updatedTweet,"Tweet Updated Successfully")
    )
  } catch (error) {
    throw new ApiError(500,"updateTweet:Database Error")
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  try {
    const {tweetid} = req.params
    const istweetDeleted = await Tweet.findByIdAndDelete(tweetid)
    if (!istweetDeleted) {
        throw new ApiError(404, "Error while deleting Tweet");
      }
    
      return res.status(200).json(
        new ApiResponse(200,{},"Tweet Created Successfully")
    )

  } catch (error) {
        throw new ApiError(404, "Database Error");
    
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
