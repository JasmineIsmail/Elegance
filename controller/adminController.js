const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const Product = require('../model/productModel')
const OtpVerification = require("../model/otpModel");;
const Order= require('../model/orderModel');

const ExcelJs=require('exceljs');
const mongoose= require('mongoose');
const securePassword = require("../helper/passwordHelper");
const {transporter,sendVerifyMail,resendOtp} = require ("../helper/mailService");
const getPagination = require("../helper/pagination");
const {topSellingProduct,topSellingCategory} = require ("../helper/topSelling");
const salesFilter = require ("../helper/salesFilter");
const {getSalesReport,salesOnDate} = require ("../helper/salesReport");
const getPdfReport = require ("../helper/pdfReport");
  // load loginpage  of admin
const loadLogin = async (req,res)=>{
    try {
        res.render('./admin/login');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const registerAdmin = async (req,res)=>{
    try {
       res.render('./admin/register') ;
    } catch (error) {
        console.log('Registration Error');
    }
}
const insertAdmin= async (req,res)=>{
    try {
        const adminExist = await User.findOne({email:req.body.email});
        if(adminExist){
            res.render('register',{message:"alreday exist"})
        }
    } catch (error) {
        
    }
}
const loginValidate = async(req,res)=>{
    try {
       const  {email,password} = req.body;
       const admin= await User.findOne({email});
       if(!admin){
        return res.render("./admin/login", {
                message: "Invalid email or password."});
       }
        const passwordMatched = await bcrypt.compare(password,admin.password);
        if(!passwordMatched){
             return res.render("./admin/login", {
                message: "Invalid email or password."});
        }
        if(passwordMatched){
            if(!admin.isAdmin){
                    res.render('./admin/login',{message:"you need to be a admin"});
            }
            if(!admin.isActive){
                     return res.render("./admin/login", {message: "Admin account is blocked."});
            }
             req.session.email = admin.email;
            req.session.admin_id = admin._id;
                //await sendVerifyMail(admin.name, admin.email);
                //return res.render("./admin/otpVerify");
            return res.redirect("/admin/dashboard");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const checkOTP = async(req,res)=>{
    try { 
        const otpReceived =await  req.body.OTP;
        const email = req.session.email;
        const otpRecord = await otpverification.findOne({email});
        if(!otpRecord){
             return res.render("./admin/otpVerify", {message: "OTP expired."});
        }
        if(otpReceived!==otpRecord.otp){
             return res.render("./admin/otpVerify", {message: "Invalid OTP."});
        }
        await OtpVerification.deleteOne({ email });
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const loadUserslist = async(req,res)=>{
    try {
         const filter = { isAdmin: false };

        const pagination = await getPagination(User,req.query.page,req.query.itemsPerPage,filter);
          const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.itemsPerPage)
            .lean();
        res.render("./admin/listUsers",{users,totalPages:pagination.totalPages,currentPage:pagination.currentPage});
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const loadUserprofile = async(req,res)=>{
    try {
        const user = await User.findById(req.query.id).lean();
         if (!user) {
            return res.status(404).send("User not found");
        }
        res.render('./admin/userProfile',{user});
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const userBlockUnblock = async(req,res)=>{
    try {
       
        const user = await User.findById(req.query.id);
         if (!user) {
            return res.status(404).send("User not found");
        }
        user.isActive=== !user.isActive ;
        await user.save();
        res.redirect('/admin/viewusers');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const getDashboard= async(req,res)=>{
    try {
        const [ userCount,productCount,orderCount,revenue,sales,topProducts,topCategory ] = await Promise.all([ 
            User.countDocuments({isAdmin:false}) , 
            Product.countDocuments() , 
            Order.countDocuments() , 
            Order.aggregate([ { $match : {status:"Delivered"}}, { $group : { _id: null, totalIncome: { $sum: "$Amount" } }}]) , 
            Order.countDocuments({status:"Delivered"}),
            topSellingProduct(),
            topSellingCategory()
        ])
        let totalPrice=revenue.length > 0 ? revenue[0].totalIncome: 0;
        res.render('./admin/dashboard',{userCount,productCount,orderCount,sales,totalPrice,topProducts,topCategory});
    } catch (error) {
       console.error(error) ;
        return res.status(500).send("Internal Server Error");
    }
}
const getExcelReport = async (req, res) => {
    try {
        const workbook = new ExcelJs.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        const salesData = await Order.find({ status: "Delivered" }).populate('userId').populate('products.productId');

        worksheet.columns = [
            { header: '#', key: 'index', width: 5 },
            { header: 'USER', key: 'user', width: 30 },
            { header: 'DATE', key: 'date', width: 30 },
            { header: 'PRODUCT',key:'product',width:45},
            { header: 'AMOUNT',key:"price",width:10},
            { header: 'QUANTITY',key:'quantity',width:5},
            { header: 'PAYMENT', key: 'payment', width: 15 },
            { header: 'TOTAL', key: 'total', width: 15 },
        ];

        let { fromDate, toDate } = req.body;
        fromDate = new Date(fromDate);
        toDate = new Date(toDate);

        salesData.forEach((sale, index) => {
            var orderDate = new Date(sale.date);
            if (orderDate >= fromDate && orderDate <= toDate) {
                const productsData = sale.products.map(pdt => ({
                    product: pdt.productId.Name,
                    price: pdt.productPrice,
                    quantity: pdt.count
                }));
                productsData.forEach((product, idx) => {
                const rowData = {
                    index: index + 1,
                    user: sale.userId.name,
                    date: sale.date.toLocaleDateString(),
                    payment: sale.paymentMethod,
                    total: sale.Amount,
                    product: product.product,
                    price: product.price,
                    quantity: product.quantity
                };
        
                worksheet.addRow(rowData);
                });
        
                
            }
        });

        var filename = "orders_" + fromDate.toISOString() + "_" + toDate.toISOString() + ".xlsx";

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + filename);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.log(error.message);
    }
}

// ADMIN LOGOUT
const logout = async(req,res)=>{
    try {
        req.session.destroy((err) =>{
            if (err) {
                return res.status(500).send("Logout Failed");
            }
            res.clearCookie("connect.sid");
            res.redirect("/admin");
        });
    } catch (error) {
       console.error(error);
       res.status(500).send("Internal Server Error");
    }
}

module.exports={loadLogin,
    checkOTP,
    loginValidate,
    loadUserslist,
    loadUserprofile,
    userBlockUnblock,
    getDashboard,
    getExcelReport,
    logout,
    resendOtp,
    salesFilter,
    getSalesReport,
    salesOnDate,
    getPdfReport
}