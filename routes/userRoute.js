const express= require("express");
const session =require("express-session");
const userRoute= express();
const sessionSecret = require('../config/session');
const userAuth = require('../middlewares/userAuth');
const path=require('path');

const userController= require("../controller/userController");
const cartController = require('../controller/cartController');
const addressController = require('../controller/addressController');
const orderController = require('../controller/orderController');
const wishlistController= require('../controller/wishlistController');
const couponController = require('../controller/couponController');
const { config } = require("dotenv");
const orderModel = require("../model/orderModel");
//session handling
userRoute.use(session({
    secret:sessionSecret.sessionSecret,
    resave: false,
    saveUninitialized:false,
}));
userRoute.use(express.static('public'));
//userRoute.use('/user_assets', express.static('public/user_assets'));
userRoute.use( express.json());
userRoute.use(express.urlencoded({ extended: true }));
userRoute.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});


userRoute.get('/login',userAuth.isLogout,userController.loadLogin);
userRoute.get('/register',userController.registerUser);
userRoute.get('/resendOTP',userAuth.isLogout,userController.resendOtp);
userRoute.get('/home',userAuth.isLogin,userController.loadHome);
userRoute.get('/product_detail',userAuth.isLogin,userController.productOverview);
userRoute.get('/addToCart',userAuth.isLogin,cartController.addToCart);
userRoute.get('/viewCart',userAuth.isLogin,cartController.loadCart);
userRoute.get('/deleteItem',userAuth.isLogin,cartController.deleteItem);
userRoute.get('/checkout',userAuth.isLogin,addressController.checkout);
userRoute.get('/add_address',addressController.addAddress);
userRoute.get('/edit_address',userAuth.isLogin,addressController.editAddress);
userRoute.get('/user_profile',userAuth.isLogin,userController.userProfile);
userRoute.get('/edit_profile',userAuth.isLogin,userController.editProfile);
userRoute.get('/manage_address',userAuth.isLogin,userController.manageAddress);
userRoute.get('/delete_address',userAuth.isLogin,userController.deleteAddress);
userRoute.get('/change_password',userAuth.isLogin,userController.managePassword);
userRoute.get('/logout',userAuth.isLogin,userController.logOut);
userRoute.get('/orders',userAuth.isLogin,orderController.viewOrders);
userRoute.get('/cancelOrder/:id',userAuth.isLogin,orderController.cancelOrder);
userRoute.get('/forgotPassword',userController.loadForgotPassword);
userRoute.get('/addToWishlist',userAuth.isLogin,wishlistController.addToWishlist);
userRoute.get('/wishlist',userAuth.isLogin,wishlistController.viewWishlist);
userRoute.get('/removeWishlist',userAuth.isLogin,wishlistController.removeWishlist);
userRoute.get('/movetoCart',userAuth.isLogin,wishlistController.addFromWishlist);
userRoute.get('/returnOrder/:id',userAuth.isLogin,orderController.returnOrder);
userRoute.get('/wallet',userAuth.isLogin,userController.loadWallet);
userRoute.get('/products',userAuth.isLogin,userController.loadProducts);
userRoute.get('/products/:category',userAuth.isLogin,userController.ProductsByCategory);
userRoute.get('/filter/:type',userAuth.isLogin,userController.filterProducts);
userRoute.get('/invoice',userAuth.isLogin,orderController.downloadInvoice);
userRoute.post('/change_password',userAuth.isLogin,userController.changePassword);
userRoute.post("/register",userController.insertUser);
userRoute.post('/verify',userAuth.isLogout,userController.checkOTP);
userRoute.post('/loginverify',userAuth.isLogout,userController.loginVerification);
userRoute.post('/save_address',userAuth.isLogin,addressController.saveAddress);
userRoute.post('/change_address',userAuth.isLogin,addressController.changeAddress);
userRoute.post('/update_profile',userAuth.isLogin,userController.updateProfile);
userRoute.post('/changeProductQuantity',userAuth.isLogin, cartController.changeProductQuantity);
userRoute.post('/createOrder',userAuth.isLogin,orderController.newOrder);
userRoute.post('/forgotPassword',userController.forgotPassword);
userRoute.post('/resetPassword',userController.checkOTP);
userRoute.post('/returnOrder/:id',userAuth.isLogin,orderController.returnSubmit);
userRoute.post('/verifyPayment',userAuth.isLogin,orderController.verifyPayment);
userRoute.post("/applyCoupon",userAuth.isLogin,couponController.applyCoupon);
userRoute.post('/removeCoupon',userAuth.isLogin,couponController.removeCoupon);
userRoute.post('/paymentFail',userAuth.isLogin,orderController.failedPayment);
userRoute.post('/continuePayment',userAuth.isLogin,orderController.continuePayment);
module.exports=userRoute;