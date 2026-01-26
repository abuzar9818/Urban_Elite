const jwt = require("jsonwebtoken");
const ownerModel = require("../models/owner-model");

module.exports = async (req, res, next) => {
	try {
		// Check if the token exists in the request cookies
		if (!req.cookies.ownerToken) {
			req.flash("error", "Please log in to continue.");
			return res.redirect("/owners/login");
		}

		// Verify the token and decode its payload
		let decoded = jwt.verify(req.cookies.ownerToken, process.env.JWT_KEY);

		// Find the owner based on the decoded email
		let owner = await ownerModel
			.findOne({ email: decoded.email })
			.select("-password");

		// If owner is found, attach it to the request object
		if (owner) {
			req.owner = owner;
			next();
		} else {
			req.flash("error", "Owner not found.");
			res.redirect("/owners/login");
		}
	} catch (err) {
		console.error(err);
		req.flash("error", "Something went wrong.");
		res.redirect("/owners/login");
	}
};
