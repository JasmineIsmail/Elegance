require('dotenv').config(); 
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const OtpVerification = require("../model/otpModel");
const User = require("../model/userModel");

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Generate OTP function
const generateOTP = () => {
    return otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
};

// Send verification mail & update OTP model
const sendVerifyMail = async (name, email) => {
    try {
        const OTP = generateOTP();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP Verification Mail',
            html: `<p>Hi ${name}, please enter the OTP to login, your OTP is:</p>
                   <h2>${OTP}</h2>
                   <p>This OTP is valid for 5 minutes.</p>`
        };

        await transporter.sendMail(mailOptions);
        await OtpVerification.findOneAndUpdate(
            { email },
            { email, otp: OTP },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error("OTP Mail Error:", error);
        return false;
    }
};

const resendOtp = async (req, res) => {
    try {
        const email = req.session.email;
        if (!email) return res.redirect("/login");

        const user = await User.findOne({ email });
        if (!user) return res.redirect("/register");

        await sendVerifyMail(user.name, user.email);
        res.render("./users/otpVerify", { email });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};
module.exports = {transporter,generateOTP,sendVerifyMail,resendOtp} ;