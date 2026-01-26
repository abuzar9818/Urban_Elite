const express = require("express");
const router = express.Router();
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const upload = require("../config/multer-config");
const isOwnerLoggedIn = require("../middleware/isOwnerLoggedIn");
const { loginOwner, logoutOwner, registerOwner } = require("../controllers/ownerController");

// Owner registration page
router.get("/register", (req, res) => {
	let error = req.flash("error");
	let success = req.flash("success");
	res.render("owner-register", { error, success, loggedin: false });
});

// Owner registration POST
router.post("/register", registerOwner);

// Owner login page
router.get("/login", (req, res) => {
	let error = req.flash("error");
	let success = req.flash("success");
	res.render("owner-login", { error, success, loggedin: false });
});

// Owner login POST
router.post("/login", loginOwner);

// Owner logout
router.get("/logout", isOwnerLoggedIn, logoutOwner);

// Admin dashboard - protected route
router.get("/admin", isOwnerLoggedIn, async (req, res) => {
	try {
		const products = await productModel.find();
		const users = await userModel.find({}).populate('orders');
		let success = req.flash("success");
		let error = req.flash("error");
		
		// Generate sales data
		let totalOrders = 0;
		let todayOrders = 0;
		let todaySales = 0;
		let weekSales = 0;
		let monthSales = 0;		
		
		users.forEach(user => {
			if(user.orders && user.orders.length > 0) {
				totalOrders += user.orders.length;
				
				user.orders.forEach(order => {
					const orderDate = new Date(order.date);
					const today = new Date();
					const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
					const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
					
					// Today's orders and sales
					if(orderDate.toDateString() === today.toDateString()) {
						todayOrders++;
						todaySales += order.total || 0;
					}
					
					// This week's sales
					if(orderDate >= thisWeek) {
						weekSales += order.total || 0;
					}
					
					// This month's sales
					if(orderDate >= thisMonth) {
						monthSales += order.total || 0;
					}
				});
			}
		});
		
		const salesData = {
			todaySales: todaySales,
			weekSales: weekSales,
			monthSales: monthSales,
			totalOrders: totalOrders,
			todayOrders: todayOrders,
			avgOrderValue: totalOrders > 0 ? Math.floor(todaySales / todayOrders) : 0,
			topProducts: products.slice(0, 5).map(p => ({
				name: p.name,
				sales: Math.floor(Math.random() * 100) + 10,
				revenue: (p.price * (Math.floor(Math.random() * 100) + 10))
			}))
		};
		
		res.render("admin", { products, users, success, error, salesData, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Admin reviews page
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
		
		// Convert to array and calculate averages
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

// Admin orders page
router.get("/orders", isOwnerLoggedIn, async (req, res) => {
	try {
		const users = await userModel.find({}).populate('orders');
		
		// Flatten all orders from all users
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
		
		// Sort by date (newest first)
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
		// Generate random sales data
		const salesData = {
			todaySales: Math.floor(Math.random() * 50000) + 10000,
			weekSales: Math.floor(Math.random() * 300000) + 50000,
			monthSales: Math.floor(Math.random() * 1200000) + 200000,
			totalOrders: Math.floor(Math.random() * 500) + 100,
			todayOrders: Math.floor(Math.random() * 50) + 10,
			avgOrderValue: Math.floor(Math.random() * 5000) + 2000,
			recentOrders: Array.from({ length: 10 }, (_, i) => ({
				orderId: `ORD${1000 + i}`,
				customer: `Customer ${i + 1}`,
				amount: Math.floor(Math.random() * 10000) + 1000,
				date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
				status: ['Completed', 'Pending', 'Processing'][Math.floor(Math.random() * 3)]
			}))
		};
		
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

// Update product
// Update product
router.put("/update-product/:id", isOwnerLoggedIn, async (req, res) => {
	try {
		const productId = req.params.id;
		const { name, description, price, discount, bgcolor, panelcolor, textcolor, category, stock } = req.body;
		
		// Get the existing product to preserve image path
		const existingProduct = await productModel.findById(productId);
		if (!existingProduct) {
			req.flash("error", "Product not found");
			return res.redirect("/owners/admin");
		}
		
		const updateData = {
			name: name || existingProduct.name,
			description: description || existingProduct.description,
			price: price || existingProduct.price,
			discount: discount !== undefined ? discount : existingProduct.discount,
			image: existingProduct.image, // ✅ Changed from imagePath to image
			bgcolor: bgcolor || existingProduct.bgcolor,
			panelcolor: panelcolor || existingProduct.panelcolor,
			textcolor: textcolor || existingProduct.textcolor,
			category: category || existingProduct.category,
			stock: stock !== undefined ? stock : existingProduct.stock
		};
		
		const updatedProduct = await productModel.findByIdAndUpdate(productId, updateData, { new: true });
		
		if (!updatedProduct) {
			req.flash("error", "Product not found");
			return res.redirect("/owners/admin");
		}
		
		console.log("Product updated successfully:", updatedProduct._id);
		req.flash("success", "Product updated successfully");
		res.redirect("/owners/admin");
	} catch (error) {
		console.error("Error updating product:", error);
		req.flash("error", "An error occurred while updating the product: " + error.message);
		res.redirect("/owners/admin");
	}
});

// Delete product
router.delete("/delete-product/:id", isOwnerLoggedIn, async (req, res) => {
	try {
		const productId = req.params.id;
		
		// Find and delete the product
		const deletedProduct = await productModel.findByIdAndDelete(productId);
		
		if (!deletedProduct) {
			return res.json({
				success: false,
				message: "Product not found"
			});
		}
		
		// Also remove the product from any user's cart who has it
		await userModel.updateMany(
			{ cart: { $in: [productId] } },
			{ $pull: { cart: productId } }
		);
		
		return res.json({
			success: true,
			message: "Product deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting product:", error);
		return res.json({
			success: false,
			message: "An error occurred while deleting the product"
		});
	}
});

// Create product page
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
		
		let imagePath = '';
		
		// Handle uploaded image or use default
		if (req.file) {
			// File is already saved by multer.diskStorage
			imagePath = `/images/${req.file.filename}`;
		} else {
			// Use random image from public folder
const imageFiles = ['1bag.png', '2bag.png', '3bag.png', '4bag.png', '5bag.png', '6bag.png', '7bag.png', '8bag.png','9bag.png','10bag.png','11bag.png','12bag.png'];			const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
			imagePath = `/images/${randomImage}`;
		}
		
		await productModel.create({
			name,
			description: description || 'Premium quality product from URBAN ÉLITE collection.',
			price,
			discount: discount || 0,
			image: imagePath,  // ✅ Changed from imagePath to image
			bgcolor: bgcolor || '#ffffff',
			panelcolor: panelcolor || '#f3f4f6',
			textcolor: textcolor || '#000000',
			category: category || 'bags',
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
