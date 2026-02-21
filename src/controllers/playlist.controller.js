import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist
  const { name, description } = req.body;

  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All Fields are Required");
  }

  const playlistCoverImagelocalPath = req.files?.playlistCoverImage?.[0]?.path;

  const playlistCoverImage = uploadonCloudinary(playlistCoverImagelocalPath);

  if (playlistCoverImagelocalPath & !playlistCoverImage) {
    throw new ApiError(
      500,
      "Error while uploading playlist cover image to Cloudinary"
    );
  }

  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: req.user._id,
    playlistCoverImage: playlistCoverImage | "No_image",
  });
  if (!playlist) {
    throw new ApiError(500, "Error while Creating new Playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created Successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    //TODO: get user playlists
    const userPlaylist = await Playlist.aggregate([
      {
        $match: { owner: userId },
      },
      {
        $lookup: {
          from: "users",
          as: "userDetails",
          localField: "userId",
          foreignField: "_id",
        },
        pipeline: {
          $project: {
            username: 1,
            fullname: 1,
            email: 1,
            avatar: 1,
          },
        },
      },
      {
        $addFields: {
          userDetails: { $first: "userDetails" },
        },
      },
    ]);
  
    if (!userPlaylist) {
      throw new ApiError(500, "Error while Fetching Playlists");
    }
  
    return res.status(200).json(
      new ApiResponse(200, userPlaylist, "Playlists Fetched Successfully")
    )
  } catch (error) {
    throw new ApiError(500,"Internal Server Error")
  }

});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
