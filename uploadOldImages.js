require("dotenv").config();
const cloudinary = require("./config/cloudinary");
const fs = require("fs");
const path = require("path");
const productModel = require("./models/product-model");
require("./config/mongoose-connection");

const folderPath = path.join(__dirname, "public/images");

async function uploadImages() {
    try {
        const files = fs.readdirSync(folderPath);

        for (const file of files) {

            // Ignore hidden files and non-images
            if (file.startsWith(".") || !/\.(png|jpg|jpeg|webp)$/i.test(file)) {
                console.log("Skipping:", file);
                continue;
            }

            const filePath = path.join(folderPath, file);

            console.log("Uploading:", file);

            const result = await cloudinary.uploader.upload(filePath, {
                folder: "urban-elite",
            });

            console.log("Uploaded URL:", result.secure_url);

            await productModel.updateMany(
                { image: `/images/${file}` },
                { image: result.secure_url }
            );

            console.log("Database updated for:", file);
        }

        console.log("✅ All images migrated successfully!");
        process.exit();
    } catch (error) {
        console.error("Migration error:", error);
        process.exit(1);
    }
}

uploadImages();