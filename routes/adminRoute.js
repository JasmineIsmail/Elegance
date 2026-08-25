const express= require("express");
const session =require("express-session");
const sessionSecret = require('../config/session');
const adminAuth = require('../middlewares/adminAuth');
const productController = require('../controller/productController');
const categoryController=require('../controller/categoryController');
const orderController=require('../controller/orderController');
const upload =require('../middlewares/upload');

const adminController= require ("../controller/adminController");
const couponController=require("../controller/couponController");
const { config } = require("dotenv");
const couponModel = require("../model/couponModel");
const offerController= require('../controller/offerController');
const adminRoute= express();
//session handling
adminRoute.use(session({
    secret:sessionSecret.sessionSecret,
    resave: false,
    saveUninitialized:false,
}));
adminRoute.use(express.static("public"));
adminRoute.use( express.json());
adminRoute.use(express.urlencoded({ extended: true }));
adminRoute.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});


adminRoute.get('/',adminAuth.isLogout,adminController.loadLogin);
adminRoute.get('/resendOTP',adminAuth.isLogout,adminController.resendOtp);
adminRoute.get('/dashboard',adminAuth.isLogin,adminController.getDashboard);
//adminRoute.get('/register',adminController.registerAdmin);
adminRoute.get('/viewusers',adminController.loadUserslist);
adminRoute.get('/userprofile',adminController.loadUserprofile);
adminRoute.get('/userBlockUnblock',adminAuth.isLogin,adminController.userBlockUnblock);
adminRoute.get('/viewProducts',adminAuth.isLogin,productController.viewProducts);
adminRoute.get('/viewCategories',adminAuth.isLogin,categoryController.loadCategories);
adminRoute.get("/addCategory",adminAuth.isLogin,categoryController.addCategory);
adminRoute.get("/edit_category",adminAuth.isLogin,categoryController.editCategory);
adminRoute.get('/delete_category',categoryController.deleteCategory);
adminRoute.get('/add_product',adminAuth.isLogin,productController.addProduct);
adminRoute.get('/view_product',adminAuth.isLogin,productController.loadProductprofile);
adminRoute.get('/edit_product',adminAuth.isLogin,productController.editProduct);
adminRoute.get('/delete_product',adminAuth.isLogin,productController.deleteProduct);
adminRoute.get('/viewOrders',adminAuth.isLogin,orderController.listOrders);
adminRoute.get('/manageOrder',adminAuth.isLogin,orderController.manageOrders);
adminRoute.get('/cancelOrder',adminAuth.isLogin,orderController.adminCancelOrder);
adminRoute.get('/addCoupon',adminAuth.isLogin,couponController.addCoupon);
adminRoute.get('/couponList',adminAuth.isLogin,couponController.loadCoupons);
adminRoute.get('/deleteCoupon',adminAuth.isLogin,couponController.deleteCoupon);
adminRoute.get('/viewCoupon',adminAuth.isLogin,couponController.viewCoupon);
adminRoute.get('/editCoupon',adminAuth.isLogin,couponController.editCoupon);
adminRoute.get('/sales/:filter',adminAuth.isLogin,adminController.salesFilter);
adminRoute.get('/logout',adminAuth.isLogin,adminController.logout);
adminRoute.get('/offers',adminAuth.isLogin,offerController.allOffers);
adminRoute.get('/categoryOffers',adminAuth.isLogin,offerController.loadCategoryOffer);
adminRoute.get('/addCategoryOffer',adminAuth.isLogin,offerController.loadAddCategoryOffer);
adminRoute.get('/viewCategoryOffer',adminAuth.isLogin,offerController.viewCategoryOffer);
adminRoute.get('/editCategoryOffer',adminAuth.isLogin,offerController.editCategoryOffer);
adminRoute.get('/deleteCtegoryOffer',adminAuth.isLogin,offerController.deleteCategoryOffer);
adminRoute.get('/productOffers',adminAuth.isLogin,offerController.loadProductOffer);
adminRoute.get('/addProductOffer',adminAuth.isLogin,offerController.loadAddProductOffer);
adminRoute.get('/viewProductOffer',adminAuth.isLogin,offerController.viewProductOffer);
adminRoute.get('/editProductOffer',adminAuth.isLogin,offerController.editProductOffer);
adminRoute.get('/deleteProductOffer',adminAuth.isLogin,offerController.deleteProductOffer);
adminRoute.get('/deleteImage',adminAuth.isLogin,productController.deleteImage);
adminRoute.post('/loginverify',adminAuth.isLogout,adminController.loginValidate);

//adminRoute.post('/verify',adminAuth.isLogout,adminController.checkOTP);
adminRoute.post('/uploadCategory',adminAuth.isLogin,upload.single('catImage'),categoryController.loadAddCategory);
adminRoute.post('/update_category',adminAuth.isLogin,upload.single('catImage'),categoryController.updateCategory);
adminRoute.post('/upload_product',adminAuth.isLogin,upload.array('images',8),productController.uploadProduct);
adminRoute.post('/update_product',adminAuth.isLogin,upload.array('images',8),productController.updateProduct);
adminRoute.post('/manageOrder',adminAuth.isLogin,orderController.orderStatusUpdate);
adminRoute.post('/manageorder/singleproduct/:id',adminAuth.isLogin,orderController.productOrderStatusUpdate);
adminRoute.post('/uploadCoupon',adminAuth.isLogin,couponController.postCoupon);
adminRoute.post('/editCoupon',adminAuth.isLogin,couponController.updateCoupon);
adminRoute.post('/salesReport',adminAuth.isLogin,adminController.getSalesReport);
adminRoute.post('/salesOnDate',adminAuth.isLogin,adminController.salesOnDate);
adminRoute.post('/downloadPdf',adminAuth.isLogin,adminController.getPdfReport);
adminRoute.post('/downloadExcel',adminAuth.isLogin,adminController.getExcelReport);
adminRoute.post('/addCategoryOffer',adminAuth.isLogin,offerController.addCategoryOffer);
adminRoute.post('/editCategoryOffer',adminAuth.isLogin,offerController.updateCategoryOffer);
adminRoute.post('/addProductOffer',adminAuth.isLogin,offerController.addProductOffer);
adminRoute.post('/editProductOffer',adminAuth.isLogin,offerController.updateProductOffer);
//adminRoute.post('/addRefferalOffer',adminAuth.isLogin,offerController.addRefferalOffer);
adminRoute.post('/replaceImg',adminAuth.isLogin,upload.single('newPic'),productController.imageReplace);
module.exports=adminRoute;