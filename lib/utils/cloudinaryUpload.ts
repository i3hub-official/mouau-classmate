// File: lib/utils/cloudinaryUpload.ts
"use server";

import { cloudinary } from "@/lib/utils/cloudinary";

export const uploadImageForRegistration = async (
  file: File,
  jambRegNumber: string
): Promise<string> => {
  if (!file || !jambRegNumber) {
    throw new Error("File and JAMB registration number are required");
  }

  // File size validation (5KB - 25KB)
  if (file.size <5 * 1024 || file.size > 25 * 1024) {
    throw new Error("Photo must be between 5KB and 25KB");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file (JPG, PNG)");
  }

  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Unique public ID for registration
    const publicId = `img_${jambRegNumber}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.v2.uploader.upload(
      `data:${file.type};base64,${buffer.toString("base64")}`,
      {
        folder: "appMedia/images/registrations/classmates",
        public_id: publicId,
        overwrite: true, // Don't overwrite for registration
        resource_type: "image",
      }
    );

    return uploadResult.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};
