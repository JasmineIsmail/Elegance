const User = require("../model/userModel");
const otpverificationData = require("../model/otpModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const otpGenerator=require("otp-generator");
const session =require("express-session") ;
const Product = require('../model/productModel');
const Order= require('../model/orderModel');
const PDFDocument=require('pdfkit') ;
const ExcelJs=require('exceljs');
const mongoose= require('mongoose');
//password encryption
const securePassword = async (password)=>{
    try {
       const passwordHash = await bcrypt.hash(password,10) ;
       return passwordHash;
    } catch (error) {
        console.log(error.message);
        throw new Error(error);
    }
}
//nodemailer setup
const transporter= nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:'jasminismail95@gmail.com',
        pass:'dcbv ufdm rpar wlmi'
    }
})
// Generate OTP function using otp-generator
const  generateOTP = () => {
    return otpGenerator.generate(6, { digits: true, alphabets:false, upperCase: false, specialChars: false });
  };
//const OTP = generateOTP();

// send otp verification email
const sendVerifyMail = async(name,email,req,res)=>{
    try {
        let OTP = generateOTP();        
const mailOptions = {
                from:'jasminismail95@gmail.com',
                to:email,
                subject:'OTP Verificaion mail',
                html:`<p> Hii ${name} ,Please enter the OTP to login, your OTP is  ${OTP} </p>`
            }
            
            await transporter.sendMail(mailOptions,async function(error,info){
                if(error){
                    console.log(error);
                }else{
                    console.log("mail has been sent for OTP verification", info.response);
                    
                    const otpData= new otpverificationData({
                        email:email,
                        otp:OTP
                    });
                const otp_stored= await otpData.save();
                await otpverificationData.findOneAndUpdate({email:email},{$set:{otp:otp_stored.otp}});
                }
            })
        } catch (error) {
        console.log(error.message);
        res.send('Error processing OTP verification');
        }
}
// resend Otp
const resendOtp = async (req,res)=>{
    try {
      const email = req.session.email;
      const userData = await User.findOne({email:email});
      if(userData){
        sendVerifyMail(userData.name,email);
        res.render("./users/otpVerify");
      }else{
        res.status(500);
      }
    } catch (error) {
      console.log("Error sending OTP verification email:", error.message);
      throw new Error(error);
    }
  }
  


// load loginpage of admin

const loadLogin = async (req,res)=>{
    try {
        res.render('./admin/login');
    } catch (error) {
     console.log("admin panel loading error");
     throw new Error(error);
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
            res.render('register',{message:""})
        }
        
    } catch (error) {
        
    }
}
const loginValidate = async(req,res)=>{
    try {
       const  {email,password} = req.body;
       const userdata= await User.findOne({email:email});
       if(userdata){
           const passwordMatch = await bcrypt.compare(password,userdata.password);
           if(passwordMatch){
               if(userdata.isAdmin===false){
               
                   res.render('./admin/login',{message:"you need to be a admin"});
   
               }else{
                req.session.email= userdata.email;
                req.session.admin_id = userdata._id;// session keeping.
               // sendVerifyMail(userdata.name,userdata.email);
                //res.render('./admin/otpVerify');
                //res.render('./admin/dashboard',{name:'Admin'});
                res.redirect('/admin/dashboard');
               }
           }else{
            console.log("not valid");
            res.render('./admin/login',{message:'Please enter a valid username and password'});
           }
       }
       else{
        console.log("not valid");
           res.render('./admin/login',{message:'Please enter a valid username and password'});

       }
        
    } catch (error) {
        console.log(error.message);
    }
}
const checkOTP = async(req,res)=>{
    try { 
        const otpReceived =await  req.body.OTP;
        const userEmail = req.session.email;
        const otp = await otpverificationData.findOne({email:userEmail});
        if(otpReceived===otp.otp){
            //res.redirect('/admin/dashboard');
            res.render('./admin/dashboard',{name:'Admin'});
             //const updateInfo= await User.updateOne({email:userEmail},{$set:{isVerified:true}});
        }
        else{
            res.send("You have entered incorrect OTP");
        }
        
    } catch (error) {
        console.log(error.message);
    }
}
const loadUserslist = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalUsers = await User.countDocuments({});
        const totalPages = Math.ceil(totalUsers/itemsPerPage);
        const usersData = await User.find({isAdmin:false}).sort({createdAt:-1}).skip(startIndex).limit(itemsPerPage);
        res.render("./admin/listUsers",{users:usersData,totalPages,currentPage:page});
    } catch (error) {
        console.log("userlist not loading")
        res.render('./admin/dashboard');
    }
}
const loadUserprofile = async(req,res)=>{
    try {
        const findUser = await User.findById({ _id: req.query.id });
        res.render('./admin/userProfile',{user:findUser});
    } catch (error) {
       console.log(error.message);
    }
}
const userBlockUnblock = async(req,res)=>{
    try {
       
        const findUser = await User.findById({_id:req.query.id});
        console.log(findUser);
        if(findUser.isActive===true){
            await User.findByIdAndUpdate({_id:req.query.id},{$set:{isActive:'false'}});
            res.redirect('/admin/viewusers');
        }
        else{
            await User.findByIdAndUpdate({_id:req.query.id},{$set:{isActive:'true'}});
            res.redirect('/admin/viewusers');
        }

    } catch (error) {
        console.log(error.message);
    }
}
const getDashboard= async(req,res)=>{
    try {
        const [ userCount , productCount , orderCount , revenue , sales ] = await Promise.all([ 
            User.find({isAdmin:false}).count() , 
            Product.find().count() , 
            Order.find().count() , 
            Order.aggregate([ { $match : {status:"Delivered"}}, { $group : { _id: null, totalIncome: { $sum: "$Amount" } }}]) , 
            Order.find({status:"Delivered"}).count() 
        ])
        let totalPrice;
        if (revenue.length > 0) {
          totalPrice = revenue[0].totalIncome;
        }
       
        const topProducts=await topSellingProduct();
        console.log("top selling product :",topProducts);
        const topCategory = await topSellingCategory();
        console.log("top category:",topCategory);
        res.render('./admin/dashboard',{userCount,productCount,orderCount,sales,totalPrice,topProducts,topCategory});
    } catch (error) {
       console.error(error) ;
       throw new Error(error);
    }
}
const salesFilter= async(req,res)=>{
    try {
        const filterFactor= req.params.filter;
        const orders = await Order.find({status:"Delivered"});
        if(filterFactor == "month"){
            const monthlyData =orders.reduce((acc,order)=>{
                const orderDate = order.date;
                const monthYear = `${orderDate.getMonth()+1}-${orderDate.getFullYear()}`;
                
                if(!acc[monthYear]){
                    acc[monthYear]=[];
                }
    
                acc[monthYear].push(order);
                return acc;
            },{});
            res.json({success:true,monthlyData});
        }else if(filterFactor =="year"){
            const yearlyData = orders.reduce((acc,order)=>{
                const orderDate = order.date;
                const year = orderDate.getFullYear();
    
                if(!acc[year]){
                    acc[year]=[];
                }
    
                acc[year].push(order);
                return acc;
    
            },{});
            res.json({success:true,yearlyData});
        }else if(filterFactor =="week"){
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const weeklyData = await Order.aggregate([
                {
                    $match: {
                        status: "Delivered",
                        date: {
                            $gte: new Date(currentYear, 0, 1),
                            $lt: new Date(currentYear + 1, 0, 1)
                        }
                    }
                },
                {
                    $group: {
                        _id: { 
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: {
                                    $dateFromParts: {
                                        isoWeekYear: { $year: "$date" },
                                        isoWeek: { $isoWeek: "$date" },
                                        isoDayOfWeek: 1  // Monday is the first day of the week
                                    }
                                }
                            }
                         },
                        totalRevenue: { $sum: "$Amount" }
                    }
                }
            ]);
            res.json({success:true,weeklyData});
        }
    } catch (error) {
        console.error(error);
    }
}
const getSalesReport = async ( req , res ) => {
    try {
        const timeRange = req.body.timeRange;
        let fromDate , toDate;
        if(timeRange === "daily") {
            fromDate = new Date()
            fromDate.setDate(fromDate.getDate() - 1)
            toDate = new Date()
        } else if(timeRange === "weekly") {
            fromDate = new Date()
            fromDate.setDate(fromDate.getDate() - 7)
            toDate = new Date()
        } else if(timeRange === "yearly"){
            fromDate = new Date() 
            fromDate.setFullYear(fromDate.getFullYear() - 1)
            toDate = new Date()
        } else {
            return res.render('./admin/dashboard');
        }

        const salesData = await Order.find({
            status : "Delivered" ,
            date : {
                $gte : fromDate ,
                $lte : toDate
            }
        }).populate("products.productId");
        res.render("./admin/salesReport" , { salesData , fromDate , toDate });
    } catch (error) {
        console.log(error.message);
    }
}
const salesOnDate = async(req,res)=>{
    try {
        let { fromDate , toDate } = req.body;
        fromDate = new Date(fromDate);
        toDate = new Date(toDate);
        const salesData = await Order.find({
            status : "Delivered" ,
            date : {
                $gte : fromDate ,
                $lte : toDate
            }
        }).populate("products.productId");

        res.render("./admin/salesReport" , { salesData , fromDate , toDate });

    } catch (error) {
        console.error(error);
    }
}
const getPdfReport = async (req, res) => {
    try {
        let { fromDate, toDate } = req.body;
        fromDate = new Date(fromDate);
        toDate = new Date(toDate);
        const salesData = await Order.find({ status: "Delivered" }).populate('userId').populate('products.productId');

        var filename = "orders_" + fromDate.toISOString() + "_" + toDate.toISOString() + ".pdf";
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

        const doc = new PDFDocument();
        doc.pipe(res);
        doc.text("SALES REPORT", { align: "center", fontSize: 20, bold: true });
        doc.fontSize(12);
        const margin = 5;
        doc
            .moveTo(margin, margin)
            .lineTo(600 - margin, margin)
            .lineTo(600 - margin, 842 - margin)
            .lineTo(margin, 842 - margin)
            .lineTo(margin, margin)
            .lineTo(600 - margin, margin)
            .lineWidth(3)
            .strokeColor("#000000")
            .stroke();

        doc.moveDown();

        const headers = ["#", "USER", "DATE","PRODUCT","QUANTITY","PRICE", "PAYMENT", "TOTAL"];

        let headerX = 20;
        const headerY = doc.y + 10;

        doc.text(headers[0], headerX, headerY)
        headerX += 50

        headers.slice(1).forEach((header) => {
            doc.text(header, headerX, headerY);
            headerX += 90;
        });

        let dataY = headerY + 25;

        let y = headerY + 15;

        salesData.forEach((sale, index) => {
            var orderDate = new Date(sale.date);
            if (orderDate >= fromDate && orderDate <= toDate) {
                doc.text(index + 1, 20, dataY)
                doc.text(sale.userId.name, 70, dataY)
                doc.text(sale.date.toLocaleDateString(), 160, dataY)
                let productY = dataY;
                sale.products.forEach((pdt)=>{
                    doc.text(pdt.productId.Name,250, productY)
                    doc.text(pdt.count,340,productY)
                    doc.text(pdt.productPrice,430,productY)
                    productY += 15;
                })
                doc.text(sale.paymentMethod, 520, dataY)
                doc.text(sale.Amount, 610, dataY, { align: 'right' })

                dataY = productY + 10;
            
                doc
                    .moveTo(10, y)
                    .lineTo(560, y)
                    .lineWidth(1) 
                    .strokeColor("#000000") 
                    .stroke();

                y = dataY - 10;

            }
        })

        doc.moveTo(10, headerY - 10)
            .lineTo(10, dataY)
            .lineTo(560, dataY)
            .lineTo(560, headerY - 10)
            .lineTo(10, headerY - 10)
            .lineWidth(1)
            .stroke();

        const xPositions = [50, 140, 230,320, 410,500];
        xPositions.forEach((x) => {
            doc
                .moveTo(x, headerY - 10)
                .lineTo(x, dataY)
                .lineWidth(1) 
                .strokeColor("#000000")
                .stroke();
        });

        doc.end();
    } catch (error) {
        console.log(error.message);
    }
};
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
        req.session.destroy();
        res.redirect("/admin/login");
    } catch (error) {
        console.error("Error occurred while Logout ", error);
        res.status(500).send("Error occurred while Logout.");
    }
}
//TOP SELLING PRODUCT
async function topSellingProduct (){
      const topProducts = await Order.aggregate([
        {$unwind:'$products'},
        { $addFields: {
            "products.productId": { $toObjectId: "$products.productId" } // Convert to ObjectId
        }},
        {$group:{
            _id:'$products.productId',
            totalSold:{$sum:'$products.count'}
        }},
        {$lookup:{
            from: 'products',
            foreignField:'_id',
            localField:'_id',
            as:'product'
        }},
        {$unwind:'$product'},
        {
            $project:{
                _id:0,
                productId:'$product._id',
                price:'$product.price',
                name:'$product.Name',
                totalSold:1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ])
    return topProducts;
}

// TOP SELLING CATEGORY

async function topSellingCategory(){
    const topcat=await Order.aggregate([
        {   $unwind:'$products'},
        { $addFields: {
            "products.productId": { $toObjectId: "$products.productId" } // Convert to ObjectId
        }},
        {   $lookup:{
            from:'products',
            localField: 'products.productId',
            foreignField: '_id',
            as:'productDetails'
    }}, {   $unwind : '$productDetails'},
    {   $group:{
        _id:'$productDetails.category',
        totalSold : {$sum:'$products.count'}
}},
 {   $lookup:{
    from:'categories',
    localField:'_id',
    foreignField:'_id',
    as:'categoryDetails'
}},
    ]);
    const topCategory = await Order.aggregate([
        {   $unwind:'$products'},
        { $addFields: {
            "products.productId": { $toObjectId: "$products.productId" } // Convert to ObjectId
        }},
        {   $lookup:{
                from:'products',
                localField: 'products.productId',
                foreignField: '_id',
                as:'productDetails'
        }},
        {   $unwind : '$productDetails'},
        {   $group:{
                _id:'$productDetails.category',
                totalSold : {$sum:'$products.count'}
        }},
        {   $lookup:{
                from:'categories',
                localField:'_id',
                foreignField:'_id',
                as:'categoryDetails'
        }},
        {   $unwind: '$categoryDetails'},
        {   $project :{
                category:'$categoryDetails.categoryName',
                totalSold:1
        }},
        {   $sort: {totalSold :-1}}
    ])
    return topCategory;
}
module.exports={loadLogin,
    checkOTP,
    loginValidate,
    loadUserslist,
    loadUserprofile,
    userBlockUnblock,
    resendOtp,
    getDashboard,
    salesFilter,
    getSalesReport,
    salesOnDate,
    getPdfReport,
    getExcelReport,
    logout,
}