const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userName: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User",
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    productName:{
      type:String,
      required:true
    },
    productPrice: {
        type: Number,
        required: true
      }}]
    });

  const Wishlist = mongoose.model("Wishlist",wishlistSchema);
  module.exports =Wishlist;