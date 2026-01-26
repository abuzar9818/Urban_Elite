const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");
const methodOverride = require('method-override');
const ownersRouter = require("./routes/ownersRouter.js");
const usersRouter = require("./routes/usersRouter.js");
const productsRouter = require("./routes/productsRouter.js");
const indexRouter = require("./routes/index.js");
const setUser = require("./middleware/setUser");

// Load environment variables first
require("dotenv").config();
// Then connect to database
require("./config/mongoose-connection.js");

// Auto-create admin account if it doesn't exist
const ownerModel = require('./models/owner-model');
const bcrypt = require('bcrypt');

async function createAdminIfNotExists() {
    try {
        const adminCount = await ownerModel.countDocuments();
        if (adminCount === 0) {
            // Create a default admin account
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', saltRounds);
            
            await ownerModel.create({
                fullname: 'Admin',
                email: process.env.ADMIN_EMAIL || 'admin@example.com',
                password: hashedPassword,
                gstin: 'ADMIN-GSTIN-123'
            });
            
            console.log('Admin account created successfully!');
        }
    } catch (error) {
        console.error('Error creating admin account:', error);
    }
}

// Run the function after connecting to the database
setTimeout(createAdminIfNotExists, 1000);

// Auto-create sample coupons if none exist
const couponModel = require('./models/coupon-model');

async function createSampleCoupons() {
    try {
        const couponCount = await couponModel.countDocuments();
        if (couponCount === 0) {
            // Create sample coupons
            const sampleCoupons = [
                {
                    code: 'WELCOME10',
                    discountType: 'percentage',
                    discountValue: 10,
                    minOrderAmount: 500,
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    isActive: true
                },
                {
                    code: 'SAVE200',
                    discountType: 'fixed',
                    discountValue: 200,
                    minOrderAmount: 1000,
                    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
                    isActive: true
                },
                {
                    code: 'FREESHIP',
                    discountType: 'fixed',
                    discountValue: 20, // Covers platform fee
                    minOrderAmount: 500,
                    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                    isActive: true
                }
            ];
            
            await couponModel.insertMany(sampleCoupons);
            console.log('Sample coupons created successfully!');
        }
    } catch (error) {
        console.error('Error creating sample coupons:', error);
    }
}

// Run the function after connecting to the database
setTimeout(createSampleCoupons, 2000);

const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(methodOverride('_method')); // Allow PUT and DELETE methods in HTML forms
app.use(cookieParser()); // Parse cookies
app.use(
	expressSession({
		resave: false,
		saveUninitialized: false,
		secret: process.env.EXPRESS_SESSION_SECRET || "fallback-secret-key-change-in-production",
	})
); // Use express-session middleware for sessions

app.use(flash()); // Flash messages to the screen

app.use(setUser);

// ✅ Global Variables for All EJS Pages
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");

    // ✅ Make user available globally (prevents "user is not defined")
    res.locals.user = req.user || null;

    next();
});

app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" directory

app.set("views", path.join(__dirname, "views")); // Set the views directory
app.set("view engine", "ejs"); // Set the view engine to EJS

// Routes
app.use("/", indexRouter); // Use indexRouter for requests starting with "/"
app.use("/owners", ownersRouter); // Use ownersRouter for requests starting with "/owners"
app.use("/users", usersRouter); // Use usersRouter for requests starting with "/users"
app.use("/products", productsRouter); // Use productsRouter for requests starting with "/products"

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
