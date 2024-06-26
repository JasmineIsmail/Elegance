const User = require("../model/userModel");
const otpverificationData = require("../model/otpModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const otpGenerator=require("otp-generator");
const session =require("express-session") ;
const Product =require('../model/productModel');
const Category =require('../model/categoryModel');
const Address = require("../model/addressModel");
const Cart= require('../model/cartModel');
const WalletTransactions= require('../model/walletTransactionModel');
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');
//password encryption
const securePassword = async (password)=>{
    try {
       const passwordHash = await bcrypt.hash(password,10) ;
       return passwordHash;
    } catch (error) {
        console.log(error.message);
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
//LOAD HOME PAGE
const loadHome = async(req,res)=>{
  try {
   
  let search='';
 
    if(req.query.search){
      search=req.query.search;
    }
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 8 ;
    const startIndex= (page-1)* itemsPerPage;
    const endIndex=page*itemsPerPage;
    const totalProductsCount = await Product.countDocuments({});
    const totalPages = Math.ceil(totalProductsCount/itemsPerPage);
    const category = await Category.find();     
    const productData = await Product.find({status:true,$or:[{Name:{$regex:'.*'+search+'.*',$options:'i'}}]}).skip(startIndex).limit(itemsPerPage);
    const categoryOffer = await CategoryOffer.find().populate('category');
    for(let product of productData){
    product.offerPrice = Math.floor(await checkAllOffer(product));
    }
    res.render("./users/userHome", {products: productData,categories:category,categoryOffer,totalPages,currentPage:page});
  } catch (error) {
    console.log("Error loading Home page:", error);
  }
};
const filterProducts =async(req,res)=>{
  try {
    const filterType= req.params.type;
   
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 8;

    const startIndex= (page-1)* itemsPerPage;
    const endIndex=page*itemsPerPage;
    const totalProductsCount = await Product.countDocuments({});
    const totalPages = Math.ceil(totalProductsCount/itemsPerPage);
    const category = await Category.find(); 
    //const products = await Product.find({status:true});
    const categoryOffer = await CategoryOffer.find().populate('category');
    
   
    let productFiltered;
    if(filterType === 'latest'){
      productFiltered = await Product.find({status:true}).sort({createdAt:-1}).skip(startIndex).limit(itemsPerPage);
    }else if(filterType == 'lowPrice'){
        productFiltered =   await Product.find({status:true}).sort({price:1}).skip(startIndex).limit(itemsPerPage);
    }else if(filterType === 'highPrice'){
       productFiltered = await  Product.find({status:true}).sort({price:-1}).skip(startIndex).limit(itemsPerPage);
    }
    for(let product of productFiltered){
      product.offerPrice = Math.floor(await checkAllOffer(product));
    }
    res.render("./users/userHome", {products: productFiltered,categories:category,categoryOffer,totalPages,currentPage:page});
  } catch (error) {
    console.error(error);
  }
}
const loadProducts = async(req,res)=>{
  try {
    let search='';
 
    if(req.query.search){
      search=req.query.search;
    }
    const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 8;
    
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalProductsCount = await Product.countDocuments({});
        const totalPages = Math.ceil(totalProductsCount/itemsPerPage);
    const productData = await Product.find({status:true,$or:[{Name:{$regex:'.*'+search+'.*',$options:'i'}}]}).skip(startIndex).limit(itemsPerPage);
    const category = await Category.find();
    res.render("./users/products", {products: productData,categories:category,totalPages,currentPage:page});
  } catch (error) {
    console.error(error);
  }
} 
// PRODUCTS BY CATEGORY
const ProductsByCategory = async(req,res)=>{
  try {
    const cat =req.params.category.toUpperCase();
    const category = await Category.find();
    const categoryId= await Category.find({categoryName:cat}).select("_id");
    const productData = await Product.find({status:true,category:categoryId}).populate('category');
    res.render("./users/products",{products:productData,categories:category});
  } catch (error) {
    console.error(error);
  }
}
const checkAllOffer = async (product)=>{
  const categoryOffer = await CategoryOffer.findOne({category:product.category});
  const productOffer = await ProductOffer.findOne({product:product._id});
  if(categoryOffer){
      return  categoryOfferPrice= calculateDiscountedPrice(product.price,categoryOffer.discountPercentage)
  }else if(productOffer){
    return productOfferPrice =calculateDiscountedPrice(product.price,productOffer.discountPercentage)
  }else if(categoryOffer && productOffer){
        return (categoryOfferPrice  > productOfferPrice)?categoryOfferPrice :productOfferPrice;
  }else {
     return product.price; // No offer price
  }
}

const calculateDiscountedPrice = (originalPrice, discountValue) => {
  return originalPrice - (originalPrice * discountValue) / 100; // For percentage-based discount
};

// Generate OTP function using otp-generator
const  generateOTP = () => {
    return otpGenerator.generate(6, { digits: true, alphabets:false, upperCase: false, specialChars: false });
  };


// send otp verification email
const sendVerifyMail = async(name,email,req,res)=>{
    try {
      const OTP = generateOTP();  
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
    }
  }
  

// load loginpage of user

const loadLogin = async (req,res)=>{
    try {
        res.render('./users/login.ejs');
    } catch (error) {
     console.log("loading error in loading page")   ;
    }
}

const registerUser = async (req,res)=>{
    try {
       res.render('./users/register') ;
    } catch (error) {
        console.log('Registration Error');
    }
}

const insertUser= async (req,res)=>{
    try {
            const userExist = await User.findOne({email:req.body.email});
            if(userExist){
              res.send("user already exist with this email id");
              console.log("user already exist with this email id")
            }
            else{
                
                console.log(req.body.password);
                const spassword = await securePassword(req.body.password);
                const user = new User({
                    
                    name :req.body.name,
                    email :req.body.email,
                    mobile : req.body.mobile,
                    password :spassword,
                    isAdmin :false
                })
                const userData=await user.save();
                req.session.email=userData.email;
                
                 res.render('./users/otpVerify',{email:userData.email});
                sendVerifyMail(req.body.name,req.body.email);
            }
            }catch (error) {
        console.log("Error in saving user",error);
        res.status(500).send("Internal Server Error");
    }
}
const checkOTP = async(req,res)=>{
    try { 
        const otpReceived =await  req.body.OTP;
        const userEmail = req.session.email;
        const otp = await otpverificationData.findOne({email:userEmail});
        const userData = await User.findOne({email:userEmail});
        if(otpReceived===otp.otp){
          req.session.user_id = userData._id; // session keeping.
          res.redirect("/home");
          const updateInfo= await User.updateOne({email:userEmail},{$set:{isVerified:true}});
        }
        else{
          res.send("You have entered incorrect OTP");
        }
    } catch (error) {
      console.log(error.message);
    }
}
//  login verification
const loginVerification = async (req, res) => {
    try {
      const { email, password } = req.body; 
    
      const existingUser = await User.findOne({ email: email });
    
      if (existingUser) {
        if (existingUser.isActive===true) {
          const PASSWORD = await bcrypt.compare(password, existingUser.password);
          if (PASSWORD) {
            req.session.email = email;
            const userEmail = req.session.email;
            const userData = await User.findOne({email:userEmail});
            req.session.user_id = userData._id; // session keeping.
             let userId = req.session.user_id;
            
             res.redirect("/home");
          } else {
            res.render("./users/login", { message: "invalid email or password" });
          }
        } else {
          res.render("./users/login", { message: "Your account is blocked!!" });
        } 
      } else {
        res.render("./users/login", { message: "invalid email or password" }); 
      }
    } catch (error) {
      console.error("Error occurred while verifying Login ", error);
     // res.status(500).send("Error occurred while verifying Login.");
    }
  };
  const productOverview = async(req,res)=>{
    try {
      const product = req.query.product;
      const productData = await Product.findOne({Name:product});
      const categoryId = productData.category;
      const category = await Category.findById({_id:categoryId});
      productData.offerPrice = Math.floor(await checkAllOffer(productData));
      res.render("./users/productDetail",{productData:productData,category});
    } catch (error) {
      console.log(error.message);
    }
  }
  const userProfile= async(req,res)=>{
    try {
      const user = await User.findById({_id:req.session.user_id});
      res.render('./users/user_profile',{user});
    } catch (error) {
      console.log(error.message);
    }
  }
  const editProfile = async(req,res)=>{
    try {
      const Id =  req.query.id;
      const user = await User.findById({_id:Id});
      res.render('./users/edit_profile',{user});
    } catch (error) {
      console.error(error);
    }
}
const updateProfile = async(req,res)=>{
  try {
      const user = await User.findOneAndUpdate({_id:req.query.id},{$set:{name:req.body.name,email:req.body.email,mobile:req.body.mobile}});
      res.redirect('/user_profile');
  } catch (error) {
    console.error(error);
  }
}
const manageAddress = async(req,res)=>{
  try {
    const addressData = await Address.findOne({userId:req.session.user_id});
    const user = await User.findById({_id:req.session.user_id});
    const address = addressData.addresses;
    res.render('./users/user_address',{address,user});
  } catch (error) {
    console.error(error);
  }
}
const deleteAddress = async (req,res)=>{
  try {
    const addressId= req.query.id;
    await Address.updateOne({userId:req.session.user_id},{$pull:{addresses:{_id:addressId}}});
    res.redirect('/manage_address');
  } catch (error) {
    console.error(error);
  }
}
const managePassword= async(req,res)=>{
  try {
    const user = await User.findById({_id:req.session.user_id});
    res.render('./users/changePassword',{user});
  } catch (error) {
    
  }
}
const changePassword= async(req,res)=>{
try {
  const user = await User.findById({_id:req.query.id});
  const currentPassword =req.body.currentPassword;
  const PASSWORD = await bcrypt.compare(currentPassword,user.password);
  if(PASSWORD){
    const spassword = await securePassword(req.body.newPassword);
    await User.findByIdAndUpdate({_id:req.query.id},{$set:{password:spassword}});
    res.render('./users/changePassword',{user,message:"Sucssessfully changed password",user});
  }else{
    res.render('./users/changePassword',{user,message:"You need to enter the current password corectly to change it"});
  }
 
} catch (error) {
  console.error(error);
}
}
const logOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/login");
  } catch (error) {
    console.error("Error occurred while Logout ", error);
    res.status(500).send("Error occurred while Logout.");
  }
}
const loadForgotPassword= async(req,res)=>{
  try {
    res.render('./users/forgotPassword');
  } catch (error) {
    console.error(error);
  }
}

const forgotPassword=async(req,res)=>{
  try {
    const email= req.body.email;
    req.session.email= email;
    const user  = await User.findOne({email:email});
    if(!user){
        return res.render('forgotpassword',{message:"no user with this email exist"});
      }
    //if user exist generate random string and send it as email
    sendVerifyMail(user.name,email); 
    res.render('./users/resetPassword',{message:"new password sent via email,login with it"});
  } catch (error) {
    console.error(error);
  }
}
const loadWallet = async(req,res)=>{
  try {
    const user= await User.findById(req.session.user_id).populate("walletTransactions");
    if(!user)
      return res.status(404).json({message:"No such user found"}) ;
      const walletTransaction=[...user.walletTransactions];
      walletTransaction.sort((a,b)=>{
        return new Date(b.date) - new Date(a.date);
      })
    const pageNumber = req.query.page || 1;
    let itemsPerPage = 5;
    let totalPages = Math.floor(walletTransaction.length / itemsPerPage);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = pageNumber * itemsPerPage;

    const currentTransactions = walletTransaction.slice(startIndex, endIndex);

      res.render('./users/userWallet',{user,currentTransactions,totalPages,currenrPage:pageNumber});
    } catch (error) {
    console.error(error);
  }
}
module.exports= {
    loadLogin,
    registerUser,
    sendVerifyMail,
    insertUser,
    checkOTP,
    loginVerification,
    resendOtp,
    loadHome,
    loadProducts,
    ProductsByCategory,
    filterProducts,
    productOverview,
    userProfile,
    editProfile,
    updateProfile,
    manageAddress,
    deleteAddress,
    managePassword,
    changePassword,
    logOut,
    loadForgotPassword,
    forgotPassword,
    loadWallet
  }