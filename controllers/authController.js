const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async (req, res) => {
	try {
		const { email, password, fullname } = req.body;

		if (!email || !password || !fullname) {
			req.flash("error", "All fields are required.");
			return res.redirect("/users/register");
		}

		let user = await userModel.findOne({ email: email });
		if (user) {
			req.flash("error", "You already have an account. Please login.");
			return res.redirect("/users/login");
		}

		bcrypt.genSalt(10, async (err, salt) => {
			if (err) {
				console.error("Error generating salt:", err);
				req.flash("error", "Error creating account. Please try again.");
				return res.redirect("/users/register");
			}

			bcrypt.hash(password, salt, async (err, hash) => {
				if (err) {
					console.error("Error hashing password:", err);
					req.flash("error", "Error creating account. Please try again.");
					return res.redirect("/users/register");
				}

				try {
					user = await userModel.create({
						email,
						password: hash,
						fullName: fullname, // Match the model field name
					});

					const token = generateToken(user);
					res.cookie("token", token);
					req.flash("success", "Account created successfully!");
					res.redirect("/home");
				} catch (createError) {
					console.error("Error creating user:", createError);
					req.flash("error", "Error creating account. Please try again.");
					return res.redirect("/users/register");
				}
			});
		});
	} catch (error) {
		console.error("Registration error:", error);
		req.flash("error", "An error occurred. Please try again.");
		res.redirect("/users/register");
	}
};

module.exports.loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			req.flash("error", "Email and password are required.");
			return res.redirect("/users/login");
		}

		const user = await userModel.findOne({ email: email });
		if (!user) {
			req.flash("error", "Email or password incorrect");
			return res.redirect("/users/login");
		}

		if (!user.password || (!user.password.startsWith('$2') && user.password.length < 50)) {
			bcrypt.genSalt(10, (err, salt) => {
				if (err) {
					console.error("Error generating salt:", err);
					req.flash("error", "An error occurred. Please try again.");
					return res.redirect("/users/login");
				}
				bcrypt.hash(password, salt, async (err, hash) => {
					if (err) {
						console.error("Error hashing password:", err);
						req.flash("error", "An error occurred. Please try again.");
						return res.redirect("/users/login");
					}
					user.password = hash;
					await user.save();
					return module.exports.loginUser(req, res);
				});
			});
			return;
		}
        
		bcrypt.compare(password, user.password, (err, result) => {
			if (err) {
				console.error("Error comparing password:", err);
				req.flash("error", "An error occurred. Please try again.");
				return res.redirect("/users/login");
			}

			if (result) {
				// Generate a token and set it as a cookie
				const token = generateToken(user);
				res.cookie("token", token);
				req.flash("success", "Login successful!");
				res.redirect("/home");
			} else {
				req.flash("error", "Email or password incorrect");
				return res.redirect("/users/login");
			}
		});
	} catch (error) {
		console.error("Login error:", error);
		req.flash("error", "An error occurred. Please try again.");
		res.redirect("/users/login");
	}
};

module.exports.logout = (req, res) => {
	res.cookie("token", "", { maxAge: 0 });
	req.flash("success", "Logged out successfully!");
	res.redirect("/");
};