import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken"

const verifyJWT = asyncHandler(async (req, _, next) => {

  try {
    const token = req.cookies?.accessToken || req.header("Authorization").replace("bearer ", "")
  
    if (!token) {
      throw new ApiError(404,"Unauthorized Access")
    }
  
    const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
    const userid = decodedtoken?._id
  
    if (!userid) {
      throw new ApiError(400,"Invalid Access Token")
    }
  
    const user = await User.findById(userid).select("-password -refreshToken")
    if (!user) {
      throw new ApiError(400,"User does not exists")
    }
  
    req.user = user
    next()
  } catch (error) {
    throw new ApiError(404,error.message || "Invalid Access Token")
  }
})

export {verifyJWT}