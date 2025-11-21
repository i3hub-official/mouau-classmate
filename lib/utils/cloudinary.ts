// File: lib/utils/cloudinary.ts
import { v2 as cloudinaryV2 } from "cloudinary";

// Configure Cloudinary with your credentials
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Create a Cloudinary uploader instance
export const cloudinary = {
  v1: cloudinaryV2,
  v2: cloudinaryV2,
  uploader: cloudinaryV2.uploader,
  config: cloudinaryConfig,
};

// Example usage:
// cloudinary.v2.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...", options)
//   .then(result => console.log(result))
//   .catch(error => console.error(error));
