const express = require("express");
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

const router = express.Router();

router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discount,
      bgcolor,
      panelcolor,
      textcolor,
      category,
      stock,
    } = req.body;

    let imagePath = "";

    // If image uploaded → Cloudinary URL
    if (req.file) {
      imagePath = req.file.path;   // ✅ Cloudinary full URL
    } else {
      // ✅ Use a default Cloudinary image URL
      imagePath = "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456/default-product.png";
    }

    await productModel.create({
      name,
      description: description || "Premium quality product from URBAN ÉLITE collection.",
      price,
      discount,
      image: imagePath,   // 🔥 Make sure your schema uses 'image'
      bgcolor,
      panelcolor,
      textcolor,
      category,
      stock: stock || 0,
    });

    req.flash("success", "✅ Product Created Successfully!");
    res.redirect("/owners/admin");

  } catch (err) {
    console.log(err);
    req.flash("error", err.message);
    res.redirect("/owners/create-product");
  }
});

module.exports = router;