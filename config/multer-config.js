const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Only PNG, JPG, JPEG, WEBP files allowed");
    }

    return {
      folder: "urban-elite",
      public_id: Date.now() + "-" + Math.round(Math.random() * 1e9),
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;