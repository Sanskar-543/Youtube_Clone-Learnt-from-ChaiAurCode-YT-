import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  replaceonCloudinary,
  uploadonCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async function (userId) {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Error occured While generating Access and Refresh Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Destructure Recieved Response
  const { email, username, password, fullname } = req.body;

  // Check for missing fields
  if (
    [email, username, password, fullname].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are Required");
  }

  const existedemail = await User.findOne({
    $or: [{ email }],
  });
  const existedusername = await User.findOne({
    $or: [{ username }],
  });

  if (existedemail) {
    throw new ApiError(409, "user with this email already exists");
  }
  if (existedusername) {
    throw new ApiError(409, "user with this username already exists");
  }

  const avatarlocalpath = req.files?.avatar?.[0]?.path;
  const coverImagelocalpath = req.files?.coverImage?.[0]?.path;

  if (!avatarlocalpath) {
    throw new ApiError(400, "avatar file is Required");
  }

  //Upload on Cloudinary

  const avatar = await uploadonCloudinary(avatarlocalpath);
  const coverImage = await uploadonCloudinary(coverImagelocalpath);

  if (!avatar) {
    throw new ApiError(400, "avatar is Required");
  }

  //Create User

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  //Prepare and send response by removing pass and refreshToken

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Internal Server Error: User not Created");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //destructure received body

  const { email, username, password } = req.body;

  //check for missing files

  if (!username && !email) {
    throw new ApiError(401, "Username or email is Required");
  }

  //find User

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  //valiadate email pass

  const ispasswordcorrect = await user.isPasswordCorrect(password);

  if (!ispasswordcorrect) {
    throw new ApiError(404, "Invalid Password");
  }

  //grant accessToken and RefreshToken

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedinuser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //send Cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        201,
        {
          accessToken,
          refreshToken,
          user: loggedinuser,
        },
        "User Loggedin Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(400, "User Does not exists");
  }
  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });

  const options = {
    secure: true,
    httpOnly: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out!!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingrefreshToken =
      (await req.cookies?.refreshToken) || req.body?.refreshToken;

    if (!incomingrefreshToken) {
      throw new ApiError(404, "Refresh Token not Found");
    }

    const decodedToken = jwt.verify(
      incomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "Refresh Token Invalid");
    }

    if (incomingrefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh Token did not match the Records");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    console.log("7");

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newrefreshToken,
          },
          "Access Token refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Unauthorized Request");
  }
});

const changePassword = asyncHandler(async (res, req) => {
  const user = await User.findById(req.user._id);

  const { oldPassword, newPassword } = req.body;

  const isPasswordCorrect = user.isPasswordCorrect(oldPassword, user.password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler((req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Succesfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar File Missing");
  }

  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw new ApiError(404, "Error While fetching user details");
  }

  const oldavatarURL = user.avatar;

  const updatedavatar = await replaceonCloudinary(
    avatarLocalPath,
    oldavatarURL
  );

  user.avatar = updatedavatar;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Succesfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(404, "coverImage File Missing");
  }

  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw new ApiError(404, "Error While fetching user details");
  }

  const oldcoverImageURL = user.coverImage;

  const updatedcoverImage = await replaceonCloudinary(
    coverImageLocalPath,
    oldcoverImageURL
  );

  user.coverImage = updatedcoverImage;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage Updated Succesfully"));
});

const getUserChannel = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(404, "Invalid Username");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscribers",
        as: "ChannelSubscribers",
        localField: "user_id",
        foreignField: "channel",
      },
    },
    {
      $lookup: {
        from: "subscribers",
        as: "ChannelsSubscribedTo",
        localField: "user_id",
        foreignField: "subscriber",
      },
    },
    {
      $addFields: {
        SubscriberCount: { $size: "$ChannelSubscribers" },
        ChannelsSubscribedToCount: { $size: "$ChannelsSubscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$ChannelSubscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        fullname: 1,
        avatar: 1,
        coverImage: 1,
        SubscriberCount: 1,
        ChannelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Chennel does not Exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel Fetched Succesfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannel,
  getWatchHistory,
};
