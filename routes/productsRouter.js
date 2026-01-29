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

    let imagePath = '';
    if (req.file) {
        const fs = require('fs');
        const path = require('path');
        const imageName = `${Date.now()}-${req.file.originalname}`;
        const uploadPath = path.join(__dirname, '../public/images', imageName);

        fs.writeFileSync(uploadPath, req.file.buffer);
        imagePath = `/images/${imageName}`;
    } else {
        const fs = require('fs');
        const path = require('path');
        const imageFiles = ['1bag.png', '2bag.png', '3bag.png', '4bag.png', '5bag.png', '6bag.png', '7bag.png', '8bag.png'];
        const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
        imagePath = `/images/${randomImage}`;
    }

    await productModel.create({
      name,
      description: description || 'Premium quality product from URBAN ÉLITE collection.',
      price,
      discount,
      imagePath: imagePath,
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
