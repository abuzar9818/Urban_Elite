const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
	try {
		if (!req.cookies.token) {
			req.flash("error", "Please log in to continue.");
			return res.redirect("/");
		}

		let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);

		let user = await userModel
			.findOne({ email: decoded.email })
			.select("-password");

		if (user) {
			req.user = user;
			next();
		} else {
			req.flash("error", "User not found.");
			res.redirect("/");
		}
	} catch (err) {
		console.error(err);
		req.flash("error", "Something went wrong."); 
		res.redirect("/");
	}
};