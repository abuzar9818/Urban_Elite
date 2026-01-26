const ownerModel = require("../models/owner-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");

// Register owner/admin
module.exports.registerOwner = async (req, res) => {
	try {
		const { email, password, fullname } = req.body;

		// Validate input
		if (!email || !password || !fullname) {
			req.flash("error", "All fields are required.");
			return res.redirect("/owners/register");
		}

		// Check if owner already exists
		let owner = await ownerModel.findOne({ email: email });
		if (owner) {
			req.flash("error", "Owner with this email already exists.");
			return res.redirect("/owners/register");
		}

		// Hash password
		bcrypt.genSalt(10, async (err, salt) => {
			if (err) {
				console.error("Error generating salt:", err);
				req.flash("error", "Error creating account. Please try again.");
				return res.redirect("/owners/register");
			}

			bcrypt.hash(password, salt, async (err, hash) => {
				if (err) {
					console.error("Error hashing password:", err);
					req.flash("error", "Error creating account. Please try again.");
					return res.redirect("/owners/register");
				}

				try {
					owner = await ownerModel.create({
						email,
						password: hash,
						fullname,
					});

					req.flash("success", "Owner account created successfully! Please login.");
					res.redirect("/owners/login");
				} catch (createError) {
					console.error("Error creating owner:", createError);
					req.flash("error", "Error creating account. Please try again.");
					return res.redirect("/owners/register");
				}
			});
		});
	} catch (error) {
		console.error("Registration error:", error);
		req.flash("error", "An error occurred. Please try again.");
		res.redirect("/owners/register");
	}
};

// Login owner/admin
module.exports.loginOwner = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Validate input
		if (!email || !password) {
			req.flash("error", "Email and password are required.");
			return res.redirect("/owners/login");
		}

		// Find the owner by email
		const owner = await ownerModel.findOne({ email: email });
		if (!owner) {
			req.flash("error", "Invalid email or password");
			return res.redirect("/owners/login");
		}

		// Check if password is hashed, if not hash it (for existing owners)
		if (!owner.password.startsWith('$2')) {
			// Password is not hashed, hash it now
			bcrypt.genSalt(10, (err, salt) => {
				if (err) {
					console.error("Error generating salt:", err);
					req.flash("error", "An error occurred. Please try again.");
					return res.redirect("/owners/login");
				}
				bcrypt.hash(password, salt, async (err, hash) => {
					if (err) {
						console.error("Error hashing password:", err);
						req.flash("error", "An error occurred. Please try again.");
						return res.redirect("/owners/login");
					}
					owner.password = hash;
					await owner.save();
					// Now try login again
					return module.exports.loginOwner(req, res);
				});
			});
			return;
		}

		// Compare the provided password with the stored hashed password
		bcrypt.compare(password, owner.password, (err, result) => {
			if (err) {
				console.error("Error comparing password:", err);
				req.flash("error", "An error occurred. Please try again.");
				return res.redirect("/owners/login");
			}

			if (result) {
				// Generate a token and set it as a cookie
				const token = generateToken(owner);
				res.cookie("ownerToken", token);
				req.flash("success", "Login successful!");
				res.redirect("/owners/admin");
			} else {
				req.flash("error", "Invalid email or password");
				return res.redirect("/owners/login");
			}
		});
	} catch (error) {
		console.error("Login error:", error);
		req.flash("error", "An error occurred. Please try again.");
		res.redirect("/owners/login");
	}
};

// Logout owner
module.exports.logoutOwner = (req, res) => {
	res.cookie("ownerToken", "", { maxAge: 0 });
	req.flash("success", "Logged out successfully!");
	res.redirect("/owners/login");
};
