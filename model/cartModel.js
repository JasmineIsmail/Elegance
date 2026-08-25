const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    count: {
      type: Number,
      default: 1,
      min:1
    },
    productPrice: {
      type: Number,
      required: true
    },
    offerPrice: {
      type: Number,
       default:0
    }
  }],
  totalPrice: {
    type: Number,
    default: 0
  }},
  {timestamps: true}
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
