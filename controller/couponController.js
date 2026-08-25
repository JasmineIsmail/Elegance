const User = require('../model/userModel');
const Coupon = require('../model/couponModel');
const Order = require('../model/orderModel');
const getPagination= require("../helper/pagination");
const { filter } = require('pdfkit');

// ADD COUPON FROM ADMIN SIDE
const addCoupon = async(req,res)=>{
    try {
        const admin = req.session.admin_id;
        res.render('./admin/addCoupon',{admin:admin,error:{},formData:{}}); 
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Server error' })
    }
}
const postCoupon=async(req,res)=>{
    try {
        const {code,startDate,expiryDate,maxUsers,description,discountType,maxDiscountAmount,maxCartAmount,discountAmount} =req.body;
        let error={};
        let formData={};
        let isValid=true;
        const trimmedCode = code ? code.trim() : '';
        const trimmedDescription = description ? description.trim() : '';
        const existingCoupon = await Coupon.findOne({ code: trimmedCode });
        if (existingCoupon) {
            return res.render('./admin/listCoupons', {message:'Coupon already exists' });
        }
        let currentDate = new Date();
        currentDate.setHours(0,0,0,0);
        if(!trimmedCode){
            error.code="Coupon code should not be blank";
            isValid=false;
        }else if(trimmedCode.length <4){
            error.code="Coupon code should contain minimum four letters";
            isValid=false;
        }else if(!/^[a-zA-Z\d\s]*$/.test(trimmedCode)){
            error.code="Coupon code can contain only letters,digits and spaces";
            isValid=false;
        }
        if(new Date(startDate) < currentDate){
            error.startDate = "Start date should be atleast today's date";
            isValid=false;
        }
        if(!trimmedDescription){
            error.description="description should not be blank";
            isValid=false;
        }else if(trimmedDescription.length <4){
            error.code="description should contain minimum four letters";
            isValid=false;
        }
        const parsedDiscount = Number(discountAmount);
        if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
            error.discount = 'Discount should be a positive number';
            isValid = false;
        }else if(discountType =="Fixed rate" && parsedDiscount > 500){
            error.discount="Maximum discount amount is 500";
            isValid=false;
        }else if(discountType== 'Percentage type' && discountAmount >100){
            error.discount="Maximum discount percentage is 100.";
            isValid=false;
        }
        const parsedMaxUsers = Number(maxUsers);
        if(!Number.isInteger(parsedMaxUsers) || parsedMaxUsers <= 0 || parsedMaxUsers > 100){
            error.maxUsers="Maximum users should be a number between 0 and 100";
            isValid=false;
        }
        const parsedMaxDiscount = Number(maxDiscountAmount);
        if(isNaN(parsedMaxDiscount) || parsedMaxDiscount > 500){
            error.maxDiscountAmount="Maximum discount limit cannot exceed 500";
            isValid=false;
        }
        const parsedMaxCart = Number(maxCartAmount);
        if (isNaN(parsedMaxCart) || parsedMaxCart < 500) {
            error.maxCartAmount = 'Minimum cart amount should be at least 500';
            isValid = false;
        }
        if(!isValid){
            res.render('./admin/addCoupon',{error, formData: req.body});
        }else {
            const coupon = new Coupon({
                code:trimmedCode,
                description:trimmedDescription,
                discountType,
                startDate,
                expiryDate,
                maxCartAmount:parsedMaxCart,
                discountAmount:parsedDiscount,
                maxDiscountAmount:parsedMaxDiscount,
                maxUsers:parsedMaxUsers,
                status:true,
                user :[]            
            });
            await coupon.save();
            res.redirect('/admin/couponList');
        }
    } catch (error) {
        console.error(error);
        return res.status(500).render('error', { message: 'Internal Server Error' });
    }
}

//LOAD AVAILABLE COUPONS
const loadCoupons = async(req,res)=>{
    try {
        let search= req.query.search || '';
        const page = parseInt(req.query.page, 10) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage, 10) || 10;
        const filter = {code: { $regex: search, $options: 'i' }};
        const pagination = await getPagination(Coupon,page,itemsPerPage,filter);
        const today = new Date();
        await Coupon.updateMany({
                         expiryDate: { $lt: new Date() },
                         status: true
                         },
                         {
                         $set: { status: false }
                         }
                     );
        const coupons = await Coupon.find(filter).skip(pagination.startIndex).limit(pagination.itemsPerPage);
        res.render("./admin/listCoupons",{coupons,totalPages:pagination.totalPages,currentPage:pagination.currentPage,message:""});
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Internal Server Error' })
    }
}
// DELETE COUPON FROM ADMION SIDE
const deleteCoupon = async (req,res)=>{
    try{
        const couponId = req.query.id;
        console.log(couponId);
        await Coupon.findByIdAndDelete(couponId);
        res.redirect('/admin/couponList');
    }catch(error){
        console.error('Error deleting coupon:', error);
        res.status(500).send('Error deleting coupon');
    }
}
// VIEW COUPON DETAILS IN ADMIN SIDE
const viewCoupon=async(req,res)=>{
    try {
        const couponId = req.query.id;
        const couponDetails= await Coupon.findById(couponId);
        res.render('./admin/viewCoupon',{coupon:couponDetails});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading coupon details');
    }
}
// EDIT COUPON BY ADMIN
const editCoupon= async(req,res)=>{
    try {
        const couponId=req.query.id;
        const couponDetails= await Coupon.findById(couponId);
        res.render("./admin/editCoupon",{coupon:couponDetails});
        
    } catch (error) {
        console.error('Error loading edit coupon:', error);
        res.status(500).send('Error loading coupon for edit');
    }
}
const updateCoupon = async(req,res)=>{
    try {
        const couponId=req.query.id;
        const updates = req.body;
        Object.keys(updates).forEach((key) => {
            if (updates[key] === undefined || updates[key] === '') {
                delete updates[key];
            }
        }); // clean out empty string update
        await Coupon.findByIdAndUpdate(couponId,{ $set: updates }, { runValidators: true });
        res.redirect('/admin/couponList');  
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to update coupon');
    }
}
const applyCoupon= async(req,res)=>{
    try {
        const {code,amount}=req.body;
        const userId = req.session.user_id;
        const couponData = await Coupon.findOne({ code });
        if (!couponData) {
            return res.json({ notFound: true });
        }
        // Check if user already used this coupon
        if (couponData.user.some(id => id.toString() === userId.toString())) {
            return res.json({ user: true });
        }
        if (couponData.maxUsers <= 0) {
            return res.json({ limit: true });
        }if (new Date(couponData.expiryDate) <= new Date()) {
            return res.json({ date: true });
        }
        if (couponData.status === false) {
            return res.json({ status: false });
        }
        const cartAmount = Number(amount);
        if (cartAmount < couponData.maxCartAmount) {
            return res.json({ cartAmount: true, maxCartAmount: couponData.maxCartAmount });
        }
        let calculatedDiscount = 0;
        if (couponData.discountType === 'Fixed rate') {
            calculatedDiscount = couponData.discountAmount;
        } else if (couponData.discountType === 'Percentage type') {
            calculatedDiscount = (couponData.discountAmount * cartAmount) / 100;
            if (couponData.maxDiscountAmount && calculatedDiscount > couponData.maxDiscountAmount) {
                calculatedDiscount = couponData.maxDiscountAmount;
            }
        } else {
            calculatedDiscount = couponData.maxDiscountAmount || 0;
        }
        await Coupon.findByIdAndUpdate(couponData._id, {
            $push: { user: userId },
            $inc: { maxUsers: -1 }
        });
        const reducedPrice = Math.max(0, Math.round(cartAmount - calculatedDiscount));

        return res.json({
            amountOkey: true,
            finalDiscount: calculatedDiscount,
            reducedPrice
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
}
const removeCoupon = async(req,res)=>{
    try {
        const couponValue = req.body.couponValue;
        const userId = req.session.user_id;
        const couponData = await Coupon.findOne({code:couponValue,user:userId});
        console.log(couponData);
        const updated = await Coupon.findOneAndUpdate(
            { code: couponValue, user: userId },
            { 
                $pull: { user: userId },
                $inc: { maxUsers: 1 }
            }
        );
        if (updated) {
            return res.json({ couponRemoved: true });
        }
       res.json({couponRemoved:false});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ couponRemoved: false });
    }
}

module.exports={
    addCoupon,
    postCoupon,
    loadCoupons,
    deleteCoupon,
    viewCoupon,
    editCoupon,
    updateCoupon,
    applyCoupon,
    removeCoupon
}