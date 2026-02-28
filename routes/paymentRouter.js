const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();
const userModel = require("../models/user-model");

let razorpay;

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Razorpay keys missing!");
} else {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

router.post("/create-order", async (req, res) => {
    if (!razorpay) {
    return res.status(500).json({ error: "Payment service not configured" });
}
    try {
        const { amount } = req.body;

        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        });

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: "Order creation failed" });
    }
});

router.post("/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Payment successful, create order in database
            let user = await userModel.findOne({ email: req.user.email }).populate("cart");

            if (!user || !user.cart || user.cart.length === 0) {
                return res.status(400).json({ success: false, message: "Cart is empty" });
            }

            let subtotal = 0;
            const orderItems = [];

            user.cart.forEach(item => {
                const finalPrice = Number(item.price || 0);
                subtotal += finalPrice;

                orderItems.push({
                    productId: item._id,
                    name: item.name,
                    price: finalPrice,
                    discount: item.discount || 0,
                    image: item.image,
                    bgcolor: item.bgcolor,
                    quantity: 1
                });
            });

            const platformFee = 20;
            let totalAmount = subtotal + platformFee;

            let couponDiscount = 0;
            if (req.session.appliedCoupon) {
                couponDiscount = Number(req.session.appliedCoupon.discount || 0);
                totalAmount -= couponDiscount;
                if (totalAmount < 0) totalAmount = 0;
            }

            const order = {
                id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                date: new Date(),
                total: totalAmount,
                couponUsed: req.session.appliedCoupon?.code || null,
                couponDiscount: couponDiscount,
                items: orderItems,
                status: "confirmed",
                paymentId: razorpay_payment_id
            };

            user.orders.push(order);

            orderItems.forEach(item => {
                user.purchases.push({
                    productId: item.productId,
                    orderId: order.id,
                    purchaseDate: order.date
                });
            });

            user.cart = [];
            delete req.session.appliedCoupon;

            await user.save();

            res.json({ success: true, orderId: order.id });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({ success: false, message: "Server error during verification" });
    }
});

module.exports = router;