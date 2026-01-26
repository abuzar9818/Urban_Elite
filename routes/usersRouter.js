const express = require("express");
const router = express.Router();

const isLoggedIn = require("../middleware/isLoggedIn");

const {
  registerUser,
  loginUser,
  logout,
} = require("../controllers/authController");

// Registration page
router.get("/register", (req, res) => {
	let error = req.flash("error");
	let success = req.flash("success");
	res.render("register", { error, success, loggedin: false });
});

// Login page
router.get("/login", (req, res) => {
	let error = req.flash("error");
	let success = req.flash("success");
	res.render("login", { error, success, loggedin: false });
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logout);

module.exports = router;
