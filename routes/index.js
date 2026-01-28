const express = require("express");
const isloggedin = require("../middleware/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const { logout } = require("../controllers/authController");

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
router.get("/contact", (req, res) => {
	let success = req.flash("success");
	let error = req.flash("error");
	// Check if user is logged in
	const loggedin = req.user ? true : false;
	res.render("contact", { success, error, loggedin });
});

// Apply coupon
router.post("/apply-coupon", isloggedin, async (req, res) => {
	try {
		const { couponCode } = req.body;
		const user = await userModel.findOne({ email: req.user.email }).populate('cart');
		
		if (!couponCode) {
			return res.json({
				success: false,
				message: "Please enter a coupon code"
			});
		}
		
		const Coupon = require('../models/coupon-model');
		const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
		
		if (!coupon) {
			return res.json({
				success: false,
				message: "Invalid coupon code"
			});
		}
		
		// Check if coupon is expired
		if (coupon.expiryDate < new Date()) {
			return res.json({
				success: false,
				message: "Coupon has expired"
			});
		}
		
		// Check if usage limit reached
		if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
			return res.json({
				success: false,
				message: "Coupon usage limit reached"
			});
		}
		
		// Calculate total cart amount
		let cartTotal = 0;
		user.cart.forEach(item => {
			cartTotal += Number(item.price || 0) + 20 - Number(item.discount || 0);
		});
		
		// Check minimum order amount
		if (cartTotal < coupon.minOrderAmount) {
			return res.json({
				success: false,
				message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
			});
		}
		
		// Calculate discount
		let discount = 0;
		if (coupon.discountType === 'percentage') {
			discount = (cartTotal * coupon.discountValue) / 100;
			// Apply max discount limit if set
			if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
				discount = coupon.maxDiscountAmount;
			}
		} else {
			// Fixed discount
			discount = coupon.discountValue;
			// Ensure discount doesn't exceed cart total
			if (discount > cartTotal) {
				discount = cartTotal;
			}
		}
		
		// Ensure discount doesn't exceed cart total
		if (discount > cartTotal) {
			discount = cartTotal;
		}
		
		// Update coupon usage count
		await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
		
		// Add coupon info to session for checkout
		req.session.appliedCoupon = {
			code: coupon.code,
			discount: discount,
			type: coupon.discountType,
			value: coupon.discountValue
		};
		
		return res.json({
			success: true,
			message: `Coupon applied successfully! You saved ₹${discount.toFixed(2)}`,
			discount: discount
		});
	} catch (error) {
		console.error('Error applying coupon:', error);
		return res.json({
			success: false,
			message: "An error occurred while applying the coupon"
		});
	}
});

// Remove coupon
router.post("/remove-coupon", isloggedin, async (req, res) => {
	try {
		// Remove coupon from session
		delete req.session.appliedCoupon;
		
		return res.json({
			success: true,
			message: "Coupon removed successfully"
		});
	} catch (error) {
		console.error('Error removing coupon:', error);
		return res.json({
			success: false,
			message: "An error occurred while removing the coupon"
		});
	}
});

// Contact form submission
router.post("/contact", async (req, res) => {
	try {
		const { name, email, message } = req.body;
		
		// Validate input
		if (!name || !email || !message) {
			req.flash("error", "Please fill in all required fields");
			return res.redirect("/contact");
		}

		// Send email notification to admin (no database storage)
		// In a real application, you would send an email here
		
		req.flash("success", "Thank you for your message! We've received your inquiry and will get back to you soon.");
		res.redirect("/contact");
	} catch (error) {
		console.error("Contact form error:", error);
		req.flash("error", "An error occurred while processing your message. Please try again later.");
		res.redirect("/contact");
	}
});



// Shop filter route (POST)
router.post("/shop/filter", isloggedin, async (req, res) => {
	try {
		let query = {};
		let sort = {};
		
		const { category, filter, sortby } = req.body;
		
		// Handle category filter
		if (category) {
			if (category === 'new') {
				query.createdAt = { $gte: new Date(Date.now() - 30*24*60*60*1000) };
			} else if (category === 'discounted') {
				query.discount = { $gt: 0 };
			} else {
				query.category = category;
			}
		}
		
		// Handle filter parameter
		if (filter) {
			if (filter === 'available') {
				query.stock = { $gt: 0 };
			} else if (filter === 'discount') {
				query.discount = { $gt: 0 };
			}
		}
		
		// Handle sorting
		if (sortby) {
			switch(sortby) {
				case 'popular':
					sort = { createdAt: -1 };
					break;
				case 'newest':
					sort = { createdAt: -1 };
					break;
				case 'price-low':
					sort = { price: 1 };
					break;
				case 'price-high':
					sort = { price: -1 };
					break;
				default:
					sort = { createdAt: -1 };
			}
		} else {
			sort = { createdAt: -1 };
		}
		
		// Fetch products
		let products = await productModel.find(query).sort(sort);
		
		res.json({
			success: true,
			products: products,
			category: category || '',
			filter: filter || '',
			sortby: sortby || ''
		});
	} catch (error) {
		console.error('Shop filter error:', error);
		res.json({
			success: false,
			message: 'Failed to filter products'
		});
	}
});

// Search route
router.get("/search", isloggedin, async (req, res) => {
	try {
		const searchTerm = req.query.q;
		
		if (!searchTerm) {
			req.flash("error", "Please enter a search term");
			return res.redirect("/shop");
		}
		
		// Search for products by name (case-insensitive)
		const products = await productModel.find({
			name: { $regex: searchTerm, $options: "i" }
		});
		
		res.render("shop", { 
			products, 
			searchTerm, 
			loggedin: true 
		});
	} catch (error) {
		console.error(error);
		req.flash("error", "Search failed");
		res.redirect("/shop");
	}
});

// Product detail route
router.get("/product/:id", isloggedin, async (req, res) => {
	try {
		const product = await productModel.findById(req.params.id);
		const user = await userModel.findOne({ email: req.user.email });
		
		if (!product) {
			req.flash("error", "Product not found");
			return res.redirect("/shop");
		}
		
		// Check if user has already submitted a review for this product
		const Review = require('../models/review-model');
		const existingReview = await Review.findOne({
			productId: req.params.id,
			userId: user._id
		});
		
		res.render("product-detail", { 
			product, 
			loggedin: true, 
			hasSubmittedReview: !!existingReview,
			user
		});
	} catch (error) {
		console.error(error);
		req.flash("error", "Error loading product");
		res.redirect("/shop");
	}
});

// Shop route with filtering and sorting
router.get("/shop", isloggedin, async (req, res) => {
	try {
		let query = {};
		let sort = {};
		
		// Handle category filter
		if (req.query.category) {
			if (req.query.category === 'new') {
				// For new collection, you might want to filter by recent date or specific tag
				// This is a placeholder - adjust based on your product model
				query.createdAt = { $gte: new Date(Date.now() - 30*24*60*60*1000) }; // Last 30 days
			} else if (req.query.category === 'discounted') {
				query.discount = { $gt: 0 };
			} else {
				query.category = req.query.category;
			}
		}
		
		// Handle filter parameter
		if (req.query.filter) {
			if (req.query.filter === 'available') {
				query.stock = { $gt: 0 };
			} else if (req.query.filter === 'discount') {
				query.discount = { $gt: 0 };
			}
		}
		
		// Handle sorting
		if (req.query.sortby) {
			switch(req.query.sortby) {
				case 'popular':
					// Placeholder for popularity sorting
					sort = { createdAt: -1 }; // Default to newest
					break;
				case 'newest':
					sort = { createdAt: -1 };
					break;
				case 'price-low':
					sort = { price: 1 };
					break;
				case 'price-high':
					sort = { price: -1 };
					break;
				default:
					sort = { createdAt: -1 };
			}
		} else {
			sort = { createdAt: -1 }; // Default sorting
		}
		
		// Fetch products from the database with filters and sorting
		let products = await productModel.find(query).sort(sort);
		let success = req.flash("success");
		
		// Pass filter parameters to the view
		res.render("shop", { 
			products, 
			success,
			category: req.query.category || '',
			filter: req.query.filter || '',
			sortby: req.query.sortby || ''
		});
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
		let bill = 0;
		user.cart.forEach(item => {
			bill += Number(item.price || 0) + 20 - Number(item.discount || 0);
		});

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
        // Check if product already in cart
        if (!user.cart.includes(req.params.productid)) {
            user.cart.push(req.params.productid);
            // Check if the request is coming from wishlist (referer contains 'wishlist')
            const referer = req.get('Referer');
            const fromWishlist = referer && referer.includes('/wishlist');
            
            // If coming from wishlist, also remove from wishlist
            if (fromWishlist && user.wishlist.includes(req.params.productid)) {
                user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productid);
            }
            
            await user.save();
            req.flash("success", "Added to cart");
            
            // If coming from wishlist, redirect to cart page
            if (fromWishlist) {
                return res.redirect("/cart");
            }
        } else {
            req.flash("success", "Product already in cart");
        }
        res.redirect("/shop");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// Remove from cart route
router.get("/removefromcart/:productid", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email });
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
		
		// Apply coupon discount if exists
		let finalBill = bill;
		let couponDiscount = 0;
		if (req.session.appliedCoupon) {
			couponDiscount = req.session.appliedCoupon.discount;
			finalBill = bill - couponDiscount;
			if (finalBill < 0) finalBill = 0;
		}
		
		res.render("checkout", { user, bill, finalBill, couponDiscount, appliedCoupon: req.session.appliedCoupon, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Process payment
router.post("/process-payment", isloggedin, async (req, res) => {
	try {
		let user = await userModel.findOne({ email: req.user.email }).populate('cart');
		
		// Calculate total amount and prepare order items
		let totalAmount = 0;
		const orderItems = [];
		
		user.cart.forEach(item => {
			const itemPrice = Number(item.price || 0) + 20 - Number(item.discount || 0);
			totalAmount += itemPrice;
			orderItems.push({
				productId: item._id,
				name: item.name,
				price: item.price,
				discount: item.discount || 0,
				image: item.image,
				bgcolor: item.bgcolor
			});
		});
		
		// Apply coupon discount if exists
		let finalTotal = totalAmount;
		let couponDiscount = 0;
		if (req.session.appliedCoupon) {
			couponDiscount = req.session.appliedCoupon.discount;
			finalTotal = totalAmount - couponDiscount;
			if (finalTotal < 0) finalTotal = 0;
		}
		
		// Create order object
		const order = {
			id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
			date: new Date(),
			total: finalTotal, // Use the discounted total
			couponUsed: req.session.appliedCoupon ? req.session.appliedCoupon.code : null,
			couponDiscount: couponDiscount,
			items: orderItems,
			status: 'confirmed'
		};
		
		// Add order to user's order history
		user.orders.push(order);
		
		// Add purchased products to user's purchases
		orderItems.forEach(item => {
			user.purchases.push({
				productId: item.productId,
				orderId: order.id,
				purchaseDate: order.date
			});
		});
		
		// Clear cart after successful payment
		user.cart = [];

		// Remove applied coupon from session
		delete req.session.appliedCoupon;

		await user.save();
		
		// Redirect to order confirmation page
		res.render('order-confirmation', { order, loggedin: true });
	} catch (error) {
		console.error(error);
		req.flash("error", "Payment failed. Please try again.");
		res.redirect("/checkout");
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
		
		// Check if current password is correct
		const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
		
		if (!isPasswordCorrect) {
			return res.json({
				success: false,
				message: "Current password is incorrect"
			});
		}
		
		// Hash new password
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
		
		// Update password
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

// Wishlist page
router.get("/wishlist", isloggedin, async (req, res) => {
	try {
		const user = await userModel.findOne({ email: req.user.email }).populate('wishlist');
		res.render("wishlist", { user, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// Add to wishlist
router.post("/add-to-wishlist/:productid", isloggedin, async (req, res) => {
	try {
		const user = await userModel.findOne({ email: req.user.email });
		const productId = req.params.productid;
		
		// Check if product is already in wishlist
		if (!user.wishlist.includes(productId)) {
			user.wishlist.push(productId);
			await user.save();
			return res.json({
				success: true,
				message: "Added to wishlist"
			});
		} else {
			return res.json({
				success: false,
				message: "Product already in wishlist"
			});
		}
	} catch (error) {
		console.error(error);
		return res.json({
			success: false,
				message: "Error adding to wishlist"
		});
	}
});

// Add to wishlist (GET route for direct link clicks)
router.get("/add-to-wishlist/:productid", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const productId = req.params.productid;
        
        // Validate that productId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            req.flash("error", "Invalid product ID");
            return res.redirect("/shop");
        }

        // Check if product is already in wishlist
        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
            req.flash("success", "Added to wishlist");
        } else {
            req.flash("error", "Product already in wishlist");
        }
        
        // Check referer to determine where to redirect
        const referer = req.get('Referer');
        if (referer && referer.includes('/product/')) {
            // If coming from product detail page, redirect back to product page
            res.redirect(referer);
        } else {
            // Otherwise, redirect to wishlist page
            res.redirect("/wishlist");
        }
    } catch (error) {
        console.error(error);
        req.flash("error", "Error adding to wishlist");
        // Redirect to shop page on error
        res.redirect("/shop");
    }
});

// Remove from wishlist
router.get("/remove-from-wishlist/:productid", isloggedin, async (req, res) => {
	try {
		const user = await userModel.findOne({ email: req.user.email });
		const productId = req.params.productid;
		
		user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
		await user.save();
		
		req.flash("success", "Removed from wishlist");
		res.redirect("/wishlist");
	} catch (error) {
		console.error(error);
		req.flash("error", "Error removing from wishlist");
		res.redirect("/wishlist");
	}
});

// My Account page
router.get("/my-account", isloggedin, async (req, res) => {
	try {
		const user = await userModel.findOne({ email: req.user.email });
		res.render("myAccount", { user, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// My Orders page
router.get("/orders", isloggedin, async (req, res) => {
	try {
		const user = await userModel.findOne({ email: req.user.email }).populate('orders');
		res.render("myOrders", { user, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// My Reviews page
router.get("/my-reviews", isloggedin, async (req, res) => {
	try {
		const user = await userModel.findOne({ email: req.user.email });
		const Review = require('../models/review-model');
		
		// Get reviews submitted by this user
		const userReviews = await Review.find({ userId: user._id })
			.populate('productId')
			.sort({ date: -1 });
		
		res.render("myReviews", { user, userReviews, loggedin: true });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

// API endpoint to get reviews for a product
// Fetch reviews
router.get("/api/reviews/:productId", async (req, res) => {
    try {
        const Review = require("../models/review-model");

        const reviews = await Review.find({ productId: req.params.productId })
            .populate("userId", "fullName email")
            .sort({ createdAt: -1 }); // ✅ FIXED

        let totalRating = 0;
        reviews.forEach(r => totalRating += r.rating);

        const averageRating =
            reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

        res.json({
            reviews,
            averageRating: parseFloat(averageRating),
            totalReviews: reviews.length,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});


// Submit Review
router.post("/submit-review/:productId", isloggedin, async (req, res) => {
    try {
        const Review = require("../models/review-model");
        const { rating, title, comment } = req.body;

        if (!rating || !title || !comment) {
            return res.json({
                success: false,
                message: "Please fill in all review fields",
            });
        }

        // ✅ Rating validation
        const ratingValue = parseInt(rating);
        if (ratingValue < 1 || ratingValue > 5) {
            return res.json({
                success: false,
                message: "Rating must be between 1 and 5",
            });
        }

        const user = await userModel.findOne({ email: req.user.email });

        const existingReview = await Review.findOne({
            productId: req.params.productId,
            userId: user._id,
        });

        if (existingReview) {
            return res.json({
                success: false,
                message: "You have already reviewed this product",
            });
        }

        const hasPurchased = user.purchases.some(
            p => p.productId.toString() === req.params.productId
        );

        if (!hasPurchased) {
            return res.json({
                success: false,
                message: "You must purchase this product before reviewing it",
            });
        }

        const newReview = new Review({
            productId: req.params.productId,
            userId: user._id,
            userName: user.fullName || user.email.split("@")[0],
            rating: ratingValue,
            title,
            comment,
        });

        await newReview.save();

        res.json({
            success: true,
            message: "Review submitted successfully",
            review: newReview,
        });

    } catch (error) {

        // ✅ Duplicate review error handling
        if (error.code === 11000) {
            return res.json({
                success: false,
                message: "You already reviewed this product",
            });
        }

        res.json({
            success: false,
            message: "An error occurred while submitting your review",
        });
    }
});

// Logout route - use the logout function from authController
router.get("/logout", isloggedin, logout);

module.exports = router;