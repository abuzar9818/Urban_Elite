const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true },

    description: {
      type: String,
      default: "Premium quality product from URBAN ÉLITE collection.",
    },

    price: { type: Number, required: true },

    discount: { type: Number, default: 0 },

    image: { type: String, required: true },

    bgcolor: { type: String, default: "#ffffff" },
    panelcolor: { type: String, default: "#f3f4f6" },
    textcolor: { type: String, default: "#000000" },

    category: { type: String, default: "General" },

    stock: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("product", productSchema);
