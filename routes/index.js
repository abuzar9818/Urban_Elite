const express = require("express");
const isloggedin = require("../middleware/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const { logout } = require("../controllers/authController");
const bcrypt = require('bcrypt');

const router = express.Router();

// Home route - Landing page (for non-logged in users)
router.get("/", (req, res) => {
	let error = req.flash("error");
	let success = req.flash("success");
	res.render("index", { error, success, loggedin: false });
});

// Home route for logged in users
router.get("/home", isloggedin, async (req, res) => {
	try {
		const products = await productModel.find().limit(6);
		let success = req.flash("success");
		res.render("home", { products, success, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// About page
router.get("/about", isloggedin, (req, res) => {
	res.render("about", { loggedin: true });
});

// Contact page
router.get("/contact", isloggedin, (req, res) => {
	let success = req.flash("success");
	let error = req.flash("error");
	res.render("contact", { success, error, loggedin: true });
});

// Contact form submission
router.post("/contact", isloggedin, (req, res) => {
	// Handle contact form submission
	req.flash("success", "Thank you for your message! We'll get back to you soon.");
	res.redirect("/contact");
});

// Product detail route
router.get("/product/:id", isloggedin, async (req, res) => {
	try {
		const product = await productModel.findById(req.params.id);
		if (!product) {
			req.flash("error", "Product not found");
			return res.redirect("/shop");
		}
		res.render("product-detail", { product, loggedin: true });
	} catch (error) {
		console.error(error);
		req.flash("error", "Error loading product");
		res.redirect("/shop");
	}
});

// Shop route
router.get("/shop", isloggedin, async (req, res) => {
	try {
		let { category, filter, sortby } = req.query;
		let query = {};
		
		// Apply category filter
		if (category === "new") {
			// For new products, we can sort by createdAt field
			// This assumes you have timestamps enabled in your product model
		} else if (category === "discounted") {
			query.discount = { $gt: 0 };
		}
		
		// Apply availability filter
		if (filter === "available") {
			query.stock = { $gt: 0 };
		} else if (filter === "discount") {
			query.discount = { $gt: 0 };
		}
		
		// Apply sorting
		let sortOption = {};
		if (sortby === "newest") {
			sortOption = { createdAt: -1 };
		} else if (sortby === "popular") {
			// For popular, we could sort by number of purchases (if tracked)
			sortOption = { name: 1 };
		} else if (sortby === "price-low") {
			sortOption = { price: 1 };
		} else if (sortby === "price-high") {
			sortOption = { price: -1 };
		} else {
			// Default sorting: newest first
			sortOption = { createdAt: -1 };
		}
		
		// Build the product query with sorting
		let products = await productModel.find(query).sort(sortOption);
		
		let success = req.flash("success");
		res.render("shop", { products, success, category, filter, sortby }); // Pass products and filter params to the EJS view
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Cart route
router.get("/cart", isloggedin, async (req, res) => {
	try {
		// Find the user and populate their cart
		let user = await userModel.findOne({ email: req.user.email }).populate("cart");

		if (!user || !user.cart || user.cart.length === 0) {
			// Don't redirect, just render cart with empty state
			return res.render("cart", { user: { cart: [] }, bill: 0 });
		}

		// Calculate the bill by adding the price and subtracting the discount
		let subtotal = 0;
		user.cart.forEach(item => {
			subtotal += Number(item.price || 0) - Number(item.discount || 0);
		});
		const platformFee = 20;
		const bill = subtotal + platformFee;

		res.render("cart", { user, bill }); // Pass user and bill to the EJS view
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Add to cart route
router.get("/addtocart/:productid", isloggedin, async (req, res) => {
	try {
		// Find the user and add the product to their cart
		let user = await userModel.findOne({ email: req.user.email });
		// Find the product
		let product = await productModel.findById(req.params.productid);
		
		// Check if product is in stock
		if (!product || product.stock <= 0) {
			req.flash("error", "Product is out of stock");
			return res.redirect("/shop");
		}
		
		// Always add product to cart (allow multiple quantities)
		// Reduce stock by 1
		product.stock = Math.max(0, product.stock - 1); // Ensure stock doesn't go negative
		await product.save();
		
		user.cart.push(req.params.productid);
		await user.save();
		req.flash("success", "Added to cart");
		
		res.redirect("/cart");
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});


// Remove from cart route
router.get("/removefromcart/:productid", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email });
		
		// Find the product to increase stock
		let product = await productModel.findById(req.params.productid);
		if (product) {
			// Increase stock by 1
			product.stock = (product.stock || 0) + 1;
			await product.save();
		}
		
		user.cart = user.cart.filter(id => id.toString() !== req.params.productid);
		await user.save();
		req.flash("success", "Item removed from cart");
		res.redirect("/cart");
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Checkout/Payment page
router.get("/checkout", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email }).populate("cart");
		if (!user || !user.cart || user.cart.length === 0) {
			req.flash("error", "Your cart is empty");
			return res.redirect("/cart");
		}
		let bill = 0;
		user.cart.forEach(item => {
			bill += Number(item.price || 0) + 20 - Number(item.discount || 0);
		});
		res.render("checkout", { user, bill, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Apply coupon
router.post("/apply-coupon", isloggedin, async (req, res) => {
	try {
		const { couponCode } = req.body;
		
		// Find user and populate cart
		let user = await userModel.findOne({ email: req.user.email }).populate("cart");
		
		if (!user || !user.cart || user.cart.length === 0) {
			return res.json({
				success: false,
				message: "Your cart is empty"
			});
		}
		
		// Calculate subtotal
		let subtotal = 0;
		user.cart.forEach(item => {
			subtotal += Number(item.price || 0) - Number(item.discount || 0);
		});
		
		// Find coupon
		const couponModel = require("../models/coupon-model");
		const coupon = await couponModel.findOne({ 
			code: couponCode.toUpperCase(), 
			isActive: true, 
			expiryDate: { $gte: new Date() },
			usageLimit: { $eq: 0 } // Unlimited or not reached limit
		});
		
		if (!coupon) {
			return res.json({
				success: false,
				message: "Invalid or expired coupon code"
			});
		}
		
		if (subtotal < coupon.minOrderAmount) {
			return res.json({
				success: false,
				message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
			});
		}
		
		// Calculate discount
		let discount = 0;
		if (coupon.discountType === 'percentage') {
			discount = (subtotal * coupon.discountValue) / 100;
			// Apply max discount if set
			if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
				discount = coupon.maxDiscountAmount;
			}
		} else {
			discount = coupon.discountValue;
			// Ensure discount doesn't exceed subtotal
			if (discount > subtotal) {
				discount = subtotal;
			}
		}
		
		// Calculate final total (including platform fee)
		const platformFee = 20;
		const newTotal = subtotal - discount + platformFee;
		
		return res.json({
			success: true,
			message: `Coupon applied! You saved ₹${discount.toFixed(2)}`,
			discount: discount.toFixed(2),
			newTotal: newTotal.toFixed(2)
		});
	} catch (error) {
		console.error("Error applying coupon:", error);
		return res.json({
			success: false,
			message: "An error occurred while applying the coupon"
		});
	}
});

// My Account page
router.get("/my-account", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email });
		res.render("myAccount", { user, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Update user profile
router.post("/update-profile", isloggedin, async (req, res) => {
	try {
		const { contact, address } = req.body;
		const user = await userModel.findOneAndUpdate(
			{ email: req.user.email },
			{ contact, address },
			{ new: true }
		);
		
		if (user) {
			return res.json({
				success: true,
				message: "Profile updated successfully"
			});
		} else {
			return res.json({
				success: false,
				message: "User not found"
			});
		}
	} catch (error) {
		console.error("Error updating profile:", error);
		return res.json({
			success: false,
			message: "An error occurred while updating profile"
		});
	}
});

// Change password
router.post("/change-password", isloggedin, async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const user = await userModel.findOne({ email: req.user.email });
		
		if (!user) {
			return res.json({
				success: false,
				message: "User not found"
			});
		}
		
		// Compare current password with stored hash
		const isValidPassword = await bcrypt.compare(currentPassword, user.password);
		if (!isValidPassword) {
			return res.json({
				success: false,
				message: "Current password is incorrect"
			});
		}
		
		// Hash the new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		
		// Update the password
		user.password = hashedPassword;
		await user.save();
		
		return res.json({
			success: true,
			message: "Password changed successfully"
		});
	} catch (error) {
		console.error("Error changing password:", error);
		return res.json({
			success: false,
			message: "An error occurred while changing password"
		});
	}
});

// Add to wishlist (AJAX)
router.post("/add-to-wishlist/:id", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email });
		let product = await productModel.findOne({ _id: req.params.id });
		
		if (!product) {
			return res.json({
				success: false,
				message: "Product not found"
			});
		}
		
		// Check if product is already in wishlist
		if (user.wishlist.includes(product._id)) {
			// Remove from wishlist if already present
			user.wishlist = user.wishlist.filter(id => id.toString() !== product._id.toString());
			await user.save();
			return res.json({
				success: true,
				message: "Removed from wishlist"
			});
		} else {
			// Add to wishlist if not present
			user.wishlist.push(product._id);
			await user.save();
			return res.json({
				success: true,
				message: "Added to wishlist successfully"
			});
		}
	} catch (error) {
		console.error(error);
		return res.json({
			success: false,
			message: "An error occurred while updating wishlist"
		});
	}
});

// Add to wishlist
router.get("/add-to-wishlist/:productid", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email });
		
		// Check if product already in wishlist
		if (!user.wishlist) user.wishlist = [];
		if (!user.wishlist.includes(req.params.productid)) {
			user.wishlist.push(req.params.productid);
			await user.save();
			req.flash("success", "Added to wishlist");
		} else {
			req.flash("success", "Product already in wishlist");
		}
		res.redirect("/wishlist");
	} catch (error) {
		console.error(error);
		req.flash("error", "Error adding to wishlist");
		res.redirect("/wishlist");
	}
});

// Remove from wishlist
router.get("/remove-from-wishlist/:productid", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email });
		
		if (user.wishlist) {
			user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productid);
			await user.save();
			req.flash("success", "Removed from wishlist");
		}
		
		// Check if the referrer is the wishlist page, if so redirect to wishlist, otherwise back
		const referrer = req.get('Referer') || '/';
		if (referrer.includes('/wishlist')) {
			res.redirect('/wishlist');
		} else {
			res.redirect('back');
		}
	} catch (error) {
		console.error(error);
		req.flash("error", "Error removing from wishlist");
		res.redirect("back");
	}
});

// Search products
router.get("/search", isloggedin, async (req, res) => {
	try {
		const query = req.query.q;
		let products = [];
		
		if (query) {
			products = await productModel.find({
				$or: [
					{ name: { $regex: query, $options: "i" } },
					{ description: { $regex: query, $options: "i" } },
					{ category: { $regex: query, $options: "i" } }
				]
			});
		}
		
		let user = await userModel.findOne({ email: req.user.email });
		res.render("shop", { products, loggedin: true, user, searchTerm: query });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// View orders
router.get("/orders", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email }).populate("orders");
		res.render("myOrders", { user, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// View wishlist
router.get("/wishlist", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email }).populate("wishlist");
		res.render("wishlist", { user, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Process payment
router.post("/process-payment", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email }).populate('cart');
		
		// Create order from cart items
		const order = {
			id: `ORD${Date.now()}`,
			items: user.cart.map(item => ({
				_id: item._id,
				name: item.name,
				price: item.price,
				discount: item.discount,
				image: item.image,
				bgcolor: item.bgcolor,
				panelcolor: item.panelcolor,
				textcolor: item.textcolor
			})),
			total: user.cart.reduce((sum, item) => sum + Number(item.price || 0) - Number(item.discount || 0), 0) + 20, // +20 for platform fee
			date: new Date(),
			status: 'Confirmed'
		};
		
		// Permanently reduce stock for all items in cart
		for (let item of user.cart) {
			let product = await productModel.findById(item._id);
			if (product) {
				product.stock = Math.max(0, (product.stock || 0) - 1); // Ensure stock doesn't go negative
				await product.save();
			}
		}
		
		// Add order to user's orders
		if (!user.orders) user.orders = [];
		user.orders.unshift(order); // Add to beginning of array
		
		// Record purchases for review capability
		if (!user.purchases) user.purchases = [];
		order.items.forEach(item => {
			const existingPurchase = user.purchases.find(p => p.productId.toString() === item._id.toString());
			if (!existingPurchase) {
				user.purchases.push({
					productId: item._id,
					orderId: order.id
				});
			}
		});
		
		// Clear cart after successful payment
		user.cart = [];
		await user.save();
		
		// Render order confirmation page instead of redirecting to home
		res.render("order-confirmation", { order, loggedin: true });
	} catch (error) {
		console.error(error);
		req.flash("error", "Payment failed. Please try again.");
		res.redirect("/checkout");
	}
});

// Submit review route
router.post("/submit-review/:productId", isloggedin, async (req, res) => {
	try {
		const { rating, title, comment } = req.body;
		const productId = req.params.productId;
		
		// Validate input
		if (!rating || !title || !comment) {
			return res.json({
				success: false,
				message: "All fields are required"
			});
		}
		
		if (rating < 1 || rating > 5) {
			return res.json({
				success: false,
				message: "Rating must be between 1 and 5"
			});
		}
		
		// Check if user has purchased this product
		let user = await userModel.findOne({ email: req.user.email });
		const hasPurchased = user.purchases && user.purchases.some(purchase => 
			purchase.productId && purchase.productId.toString() === productId
		);
		
		if (!hasPurchased) {
			return res.json({
				success: false,
				message: "You can only review products you have purchased"
			});
		}
		
		// Check if user has already reviewed this product
		const Review = require('../models/review-model');
		const existingReview = await Review.findOne({
			productId: productId,
			userId: user._id
		});
		
		if (existingReview) {
			return res.json({
				success: false,
				message: "You have already reviewed this product"
			});
		}
		
		// Create new review
		const review = new Review({
			productId: productId,
			userId: user._id,
			userName: user.fullName || user.email.split('@')[0],
			rating: parseInt(rating),
			title: title,
			comment: comment
		});
		
		await review.save();
		
		// Populate user info for response
		await review.populate('userId', 'fullName email');
		
		return res.json({
			success: true,
			message: "Review submitted successfully!",
			review: {
				_id: review._id,
				userName: review.userName,
				rating: review.rating,
				title: review.title,
				comment: review.comment,
				date: review.date
			}
		});
	} catch (error) {
		console.error("Error submitting review:", error);
		return res.json({
			success: false,
			message: "An error occurred while submitting your review"
		});
	}
});

// Get reviews for a product
router.get("/api/reviews/:productId", async (req, res) => {
	try {
		const Review = require('../models/review-model');
		const reviews = await Review.find({ productId: req.params.productId })
			.sort({ date: -1 })
			.populate('userId', 'fullName email');
		
		// Calculate average rating
		let avgRating = 0;
		if (reviews.length > 0) {
			const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
			avgRating = (totalRating / reviews.length).toFixed(1);
		}
		
		return res.json({
			reviews: reviews,
			averageRating: avgRating,
			totalReviews: reviews.length
		});
	} catch (error) {
		console.error("Error fetching reviews:", error);
		return res.json({
			reviews: [],
			averageRating: 0,
			totalReviews: 0
		});
	}
});

// Logout route - use the logout function from authController
router.get("/logout", isloggedin, logout);

module.exports = router;