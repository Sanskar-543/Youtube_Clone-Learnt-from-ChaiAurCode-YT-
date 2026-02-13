import mongoose, { isValidObjectId, Types } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  try {
    const { channelId } = req.params;
    // TODO: toggle subscription
    const isdeleted = await Subscription.deleteOne({
      subscriber: req.user._id,
      channel: channelId,
    });
    const message = "unSubscribed";
    if (!isdeleted) {
      await Subscription.create({
        subscriber: req.user._id,
        channel: channelId,
      });
      message = "Subscribed";
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `User ${message} the Channel`));
  } catch (error) {
    throw new ApiError(500, "Database Error");
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!channelId) {
      throw new ApiError(404, "Invalid ChannelId");
    }
    const channelSubscribers = await Subscription.aggregate([
      {
        $match: {
          channel: mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $sort: -1,
      },
      {
        $lookup: {
          from: "users",
          as: "subscriberDetails",
          localField: "subscriber",
          foreignField: "_id",
        },
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
      {
        $addFields: {
          subscriberDetails: { $first: "$subscriberDetails" },
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channelSubscribers,
          "Subscribers fetched Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error: getUserChannelSubscribers");
  }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    throw new ApiError(404, "Invalid subscriberId");
  }

  const subscribedChannels = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        as: "channelDetails",
        localField: "_id",
        foreignField: "subscriber",
      },
      pipeline: [
        {
          $project: {
            username: 1,
            fullname: 1,
            email: 1,
            avatar: 1,
          },
        },
      ],
    },
    {
      $addFields: {
        channelDetails: { $first: "$channelDetails" },
      },
    },
    {
      $project: {
        username: 1,
        fullname: 1,
        email: 1,
        avatar: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200,subscribedChannels,"Channels fetched Succesfully")
  )

});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
