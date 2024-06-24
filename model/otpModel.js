const mongoose = require("mongoose");

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires:60*10
  },
  resendOTP:{
    type:String
  }
  
});


module.exports = mongoose.model('otpVerification',otpVerificationSchema);
