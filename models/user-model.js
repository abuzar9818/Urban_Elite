const mongoose = require('mongoose');

const userSchema =  mongoose.Schema({
    fullName:{
        type:String,
        minLength:3,
        trim:true,
    },
    email:String,
    password:String,
    cart:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'
    }],
    orders:{
        type:Array,
        default:[]
    },
    purchases:[{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        },
        orderId: String,
        purchaseDate: {
            type: Date,
            default: Date.now
        }
    }],
    wishlist:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'
    }],
    contact:Number,
    address:String,
    picture:String
});

module.exports = mongoose.model('user', userSchema);