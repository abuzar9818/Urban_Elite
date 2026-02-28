const express = require("express");
const router = express.Router();

const isLoggedIn = require("../middleware/isLoggedIn");

const {
	registerUser,
	loginUser,
	logout,
} = require("../controllers/authController");

router.get("/register", (req, res) => {
	res.render("register", { loggedin: false });
});

router.get("/login", (req, res) => {
	res.render("login", { loggedin: false });
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logout);

module.exports = router;
