require("dotenv").config();
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
const morgan = require("morgan");

const paymentRouter = require("./routes/paymentRouter");
require("./config/mongoose-connection.js");

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

setTimeout(createAdminIfNotExists, 1000);

const couponModel = require('./models/coupon-model');

async function createSampleCoupons() {
    try {
        const couponCodes = ['WELCOME10', 'SAVE200', 'FREESHIP']; // Add any new coupon codes here

        for (const code of couponCodes) {
            const existingCoupon = await couponModel.findOne({ code: code });
            if (!existingCoupon) {
                // Create the specific coupon if it doesn't exist
                let newCoupon;
                switch (code) {
                    case 'WELCOME10':
                        newCoupon = {
                            code: 'WELCOME10',
                            discountType: 'percentage',
                            discountValue: 10,
                            minOrderAmount: 500,
                            expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 30 days from now
                            isActive: true
                        };
                        break;
                    case 'SAVE200':
                        newCoupon = {
                            code: 'SAVE200',
                            discountType: 'fixed',
                            discountValue: 200,
                            minOrderAmount: 1000,
                            expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
                            isActive: true
                        };
                        break;
                    case 'FREESHIP':
                        newCoupon = {
                            code: 'FREESHIP',
                            discountType: 'fixed',
                            discountValue: 20,
                            minOrderAmount: 500,
                            expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                            isActive: true
                        };
                        break;
                    default:
                        continue; // Skip unknown coupon codes
                }

                if (newCoupon) {
                    await couponModel.create(newCoupon);
                    console.log(`Coupon ${code} created successfully!`);
                }
            }
        }
    } catch (error) {
        console.error('Error creating sample coupons:', error);
    }
}

setTimeout(createSampleCoupons, 2000);

async function addNewEraCoupon() {
    try {
        const existingCoupon = await couponModel.findOne({ code: 'NEWERA' });
        if (!existingCoupon) {
            const newCoupon = {
                code: 'NEWERA',
                discountType: 'fixed',
                discountValue: 1000,
                minOrderAmount: 8000,
                expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                isActive: true
            };

            await couponModel.create(newCoupon);
            console.log('NEWERA coupon created successfully!');
        }
    } catch (error) {
        console.error('Error creating NEWERA coupon:', error);
    }
}

setTimeout(addNewEraCoupon, 2500);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(
    expressSession({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET || "fallback-secret-key-change-in-production",
    })
);

app.use(flash());

app.use(setUser);

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");

    res.locals.user = req.user || null;

    next();
});

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Routes
app.use("/", indexRouter);
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/payment", paymentRouter);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
