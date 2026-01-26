const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
    if (req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);

            const user = await userModel.findOne({ email: decoded.email });
            req.user = user;
        } catch (err) {
            req.user = null;
        }
    }
    next();
};
