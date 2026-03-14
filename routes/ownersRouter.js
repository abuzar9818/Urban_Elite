const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const upload = require("../config/multer-config");
const isOwnerLoggedIn = require("../middleware/isOwnerLoggedIn");
const { loginOwner, logoutOwner, registerOwner } = require("../controllers/ownerController");
const { calculateSalesData } = require("../utils/salesStats");


// Owner login page
router.get("/login", (req, res) => {
	let error = req.flash("error");
	let success = req.flash("success");
	res.render("owner-login", { error, success, loggedin: false });
});

// Owner login POST
router.post("/login", loginOwner);

router.get("/logout", isOwnerLoggedIn, logoutOwner);

router.get("/admin", isOwnerLoggedIn, async (req, res) => {
	try {
		const products = await productModel.find();
		const users = await userModel.find({}).populate('orders');
		let success = req.flash("success");
		let error = req.flash("error");

		const salesData = await calculateSalesData();

		res.render("admin", { products, users, success, error, salesData, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

router.get("/reviews", isOwnerLoggedIn, async (req, res) => {
	try {
		const Review = require('../models/review-model');
		const reviews = await Review.find({})
			.populate('productId', 'name image')
			.populate('userId', 'fullName email')
			.sort({ date: -1 });

		// Group reviews by product
		const reviewsByProduct = {};
		reviews.forEach(review => {
			const productId = review.productId._id.toString();
			if (!reviewsByProduct[productId]) {
				reviewsByProduct[productId] = {
					product: review.productId,
					reviews: []
				};
			}
			reviewsByProduct[productId].reviews.push(review);
		});

		const productsWithReviews = Object.values(reviewsByProduct).map(productData => {
			const totalRating = productData.reviews.reduce((sum, review) => sum + review.rating, 0);
			const averageRating = (totalRating / productData.reviews.length).toFixed(1);
			return {
				...productData,
				averageRating: parseFloat(averageRating),
				totalReviews: productData.reviews.length
			};
		});

		res.render("admin-reviews", { productsWithReviews, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

router.get("/orders", isOwnerLoggedIn, async (req, res) => {
	try {
		const users = await userModel.find({}).populate('orders');

		let allOrders = [];
		users.forEach(user => {
			if (user.orders && user.orders.length > 0) {
				user.orders.forEach(order => {
					allOrders.push({
						...order,
						customerName: user.fullName || user.email,
						customerId: user._id
					});
				});
			}
		});


		allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

		res.render("admin-orders", { orders: allOrders, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Sales page
router.get("/sales", isOwnerLoggedIn, async (req, res) => {
	try {
		const salesData = await calculateSalesData();
		res.render("sales", { salesData, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Edit product page
router.get("/edit-product/:id", isOwnerLoggedIn, async (req, res) => {
	try {
		const productId = req.params.id;
		const product = await productModel.findById(productId);

		if (!product) {
			req.flash("error", "Product not found");
			return res.redirect("/owners/admin");
		}

		let success = req.flash("success");
		let error = req.flash("error");
		res.render("editProducts", { product, success, error, loggedin: true });
	} catch (error) {
		console.error("Error fetching product:", error);
		req.flash("error", "An error occurred while fetching the product");
		res.redirect("/owners/admin");
	}
});

router.put("/update-product/:id",
  isOwnerLoggedIn,
  upload.single("image"),
  async (req, res) => {
    try {
      const productId = req.params.id;

      const existingProduct = await productModel.findById(productId);
      if (!existingProduct) {
        req.flash("error", "Product not found");
        return res.redirect("/owners/admin");
      }

      let updatedImage = existingProduct.image;

      // If new image uploaded
      if (req.file) {

        // 🔥 Delete old image from Cloudinary
        if (existingProduct.image) {
          const publicId = existingProduct.image
            .split("/upload/")[1]
            .split(".")[0];

          await cloudinary.uploader.destroy(publicId);
        }

        updatedImage = req.file.path; // new Cloudinary URL
      }

      await productModel.findByIdAndUpdate(productId, {
        ...req.body,
        image: updatedImage
      });

      req.flash("success", "Product updated successfully");
      res.redirect("/owners/admin");

    } catch (error) {
      console.error("Error updating product:", error);
      req.flash("error", "Update failed");
      res.redirect("/owners/admin");
    }
});

// Delete product
router.delete("/delete-product/:id", isOwnerLoggedIn, async (req, res) => {
  try {
    const productId = req.params.id;

    const deletedProduct = await productModel.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.json({
        success: false,
        message: "Product not found"
      });
    }

    // 🔥 Delete image from Cloudinary
    if (deletedProduct.image) {
      const publicId = deletedProduct.image
        .split("/upload/")[1]
        .split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    await userModel.updateMany(
      { cart: { $in: [productId] } },
      { $pull: { cart: productId } }
    );

    return res.json({
      success: true,
      message: "Product and image deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting product:", error);
    return res.json({
      success: false,
      message: "An error occurred while deleting the product"
    });
  }
});

router.get("/create-product", isOwnerLoggedIn, (req, res) => {
	let success = req.flash("success");
	let error = req.flash("error");
	res.render("createProducts", { success, error, loggedin: true });
});

// Create product POST route
router.post("/create-product", isOwnerLoggedIn, upload.single("image"), async (req, res) => {
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
      stock
    } = req.body;

    let imagePath = "";

    // If image uploaded → Cloudinary gives full URL
    if (req.file) {
      imagePath = req.file.path;   // ✅ Cloudinary URL
    } else {
      // Optional: Use a default hosted image (upload one default image to Cloudinary and paste its URL here)
      imagePath = "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456/default.png";
    }

    await productModel.create({
      name,
      description: description || "Premium quality product from URBAN ÉLITE collection.",
      price,
      discount: discount || 0,
      image: imagePath,   // ✅ now storing URL
      bgcolor: bgcolor || "#ffffff",
      panelcolor: panelcolor || "#f3f4f6",
      textcolor: textcolor || "#000000",
      category: category || "bags",
      stock: stock || 0
    });

    req.flash("success", "✅ Product Created Successfully!");
    res.redirect("/owners/admin");

  } catch (err) {
    console.error("Error creating product:", err);
    req.flash("error", err.message);
    res.redirect("/owners/create-product");
  }
});

module.exports = router;
