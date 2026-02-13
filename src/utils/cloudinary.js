import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Upload an image
const uploadonCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });
    console.log("file uploaded to cloudinary successfully");
    fs.unlinkSync(localfilepath);

    return response;
  } catch (error) {
    fs.unlinkSync(localfilepath);
  }
};

//Delete Existing file from Cloudinary

const replaceonCloudinary = async (newfile, oldfileURL) => {
  try {
    const uploadedfile = await cloudinary.uploader.upload(newfile, {
      resource_type: auto,
    });

    const oldfilePublicId = oldfileURL.split("/upload/")[1].replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");

    await cloudinary.uploader.destroy(oldfilePublicId);

    return uploadedfile;
  } catch (error) {
    fs.unlinkSync(newfile);
  }
};

export { uploadonCloudinary, replaceonCloudinary };
