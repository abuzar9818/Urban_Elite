const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    helpful: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('review', reviewSchema);