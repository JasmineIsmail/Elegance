const User = require('../model/userModel');
const Coupon = require('../model/couponModel');
const Order = require('../model/orderModel');

// ADD COUPON FROM ADMIN SIDE

const addCoupon = async(req,res)=>{
    try {
        let error={};
        const admin = req.session.admin_id;
        res.render('./admin/addCoupon',{admin:admin,error}); 
    } catch (error) {
        console.error(error);
    }
}
const postCoupon=async(req,res)=>{
    try {
        const code =req.body.code;
        const startDate =req.body.startDate;
        const expiryDate=req.body.expiryDate;
        const maxUsers= req.body.maxUsers;
        const description=req.body.description;
        const discountType=req.body.discountType;
        const maxDiscountAmount=req.body.maxDiscount;
        const maxCartAmount=req.body.maxCartAmount;
        const discountAmount=req.body.discountAmount;
        let error={};
        let isValid=true;
        let currentDate = new Date();
        currentDate.setHours(0,0,0,0);
        const coupon = await Coupon.findOne({ code: code });
        if (coupon) {
            res.render('./admin/listCoupons',{message:"Coupon already exist"});
        }
        if(code.trim()== ""){
            error.code="Coupon code should not be blank";
            isValid=false;
        }else if(code.length <4){
            error.code="Coupon code should contain minimum four letters";
            isValid=false;
        }else if(!/^[a-zA-Z\d\s]*$/.test(code)){
            error.code="Coupon code can contain only letters,digits and spaces";
            isValid=false;
        }
        if(startDate<currentDate){
            error.startDate = "Start date should be atleast today's date";
            isValid=false;
        }
        if(description.trim()== ""){
            error.description="description should not be blank";
            isValid=false;
        }else if(description.length <4){
            error.code="description should contain minimum four letters";
            isValid=false;
        }if(discountType =="Fixed rate" && discountAmount > 500){
            error.discount="Maximum discount amount is 500";
            isvalid=false;
        }else if(discountType== 'Percentage type' && discountAmount >100){
            error.discount="Maximum discount percentage is 100.";
            isValid=false;
        }
        else if(!/^\d+(\.\d+)?$/.test(discountAmount)){
            error.discount="Discount should be a number";
            isValid=false;
        }
        if(!/^\d+$/.test(maxUsers)){
            error.maxUsers="Maximum users should be a number";
            isvalid=false;
        }else if(maxUsers <=0){
            error.maxUsers="Number of users should be greater than zero";
            isValid=false;
        }else if(maxUsers>100){
            error.maxUsers="Maximum allowed users is 100";
            isValid=false;
        }
        if(!/^\d+(\.\d+)?$/.test(maxDiscountAmount)){
            error.maxDiscountAmount="Maximum discount should be a number";
            isValid=false;
        }else if(maxDiscountAmount>500){
            error.maxDiscountAmount ="Maximum discount amount is 500";
            isValid=false
        }if(!/^\d+(\.\d+)?$/.test(maxCartAmount)){
            error.maxCartAmount="Minimum cart amount should be a number";
            isValid=false;
        }else if(maxCartAmount <500){
            error.maxCartAmount="Minimum cart amount should be 500";
            isValid=false;
        }
        if(!isValid){
            res.render('./admin/addCoupon',{error});
        }else {
            const coupon = new Coupon({
                code:code,
                description:description,
                discountType:discountType,
                startDate:startDate,
                expiryDate:expiryDate,
                maxCartAmount:maxCartAmount,
                maxDiscountAmount:maxDiscountAmount,
                maxUsers:maxUsers,
            });
            const couponData = await coupon.save();
            if (couponData) {
                res.redirect('/admin/couponList');
            } else {
                res.status(500).json({ status: false });
            }
        }
    } catch (error) {
        console.error(error);
    }
}

//LOAD AVAILABLE COUPONS
const loadCoupons = async(req,res)=>{
    try {
        let search='';
        if(req.query.search){
          search=req.query.search;
        }
        let message;
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalCoupons = await Coupon.countDocuments({});
        const totalPages = Math.ceil(totalCoupons/itemsPerPage);     
        const coupons = await Coupon.find({code:{$regex:'.*'+search+'.*',$options:'i'}}).skip(startIndex).limit(itemsPerPage);
        res.render("./admin/listCoupons",{coupons,message,totalPages,currentPage:page});
    } catch (error) {
        console.error(error);
    }
}
// DELETE COUPON FROM ADMION SIDE
const deleteCoupon = async (req,res)=>{
    try{
        const couponId = req.query.id;
        console.log(couponId);
        await Coupon.deleteOne({_id:couponId});
        res.redirect('/admin/couponList');
    }catch(error){
        console.log(error.message);
    }
}
// VIEW COUPON DETAILS IN ADMIN SIDE
const viewCoupon=async(req,res)=>{
    try {
        const couponId = req.query.id;
        console.log(couponId);
        const couponDetails= await Coupon.findById({_id:couponId});
        console.log(couponDetails);
        res.render('./admin/viewCoupon',{coupon:couponDetails});
    } catch (error) {
        console.error(error);
    }
}
// EDIT COUPON BY ADMIN
const editCoupon= async(req,res)=>{
    try {
        const couponId=req.query.id;
        const couponDetails= await Coupon.findById({_id:couponId});
        res.render("./admin/editCoupon",{coupon:couponDetails});
        
    } catch (error) {
        console.error(error);
    }
}
const updateCoupon = async(req,res)=>{
    try {
        const couponId=req.query.id;
        const updates = req.body;
        console.log(updates);
        let coupon = await Coupon.findById(couponId);
           
            const status = (req.body.status== "true")?true:false;
             // Update only fields that have changed
        Object.entries(updates).forEach(([key,value]) => {
            // Check if the field exists in the updates and is different from the existing value
            if(value !== undefined && value !== "") {
                coupon[key] = value; // Update the field
            }
        });
        await coupon.save();
            res.redirect('/admin/couponList');
    } catch (error) {
        console.error(error);
    }
}
const applyCoupon= async(req,res)=>{
    try {
        const {code,amount,discount,total}=req.body;
        const userExist = await Coupon.findOne({code:code,user:{$in:[req.session.user_id]}});
        if(userExist){
            res.json({user:true});
        }else{
            const couponData = await Coupon.findOne({code:code});
            console.log(couponData);
            if(couponData){
                if(couponData.maxUsers <=0)
                    res.json({limit:true});
                else if(couponData.expiryDate <= new Date())
                    res.json({date:true});
                else if(couponData.status == false)
                    res.json({status:ture});
                else if(amount <couponData.maxCartAmount){
                    const maxCartAmount=couponData.maxCartAmount
                    res.json({cartAmount:true,maxCartAmount});
                }else{
                    await Coupon.findByIdAndUpdate({_id:couponData._id},{$push:{user:req.session.user_id}});
                    await Coupon.findByIdAndUpdate({_id:couponData._id},{$inc:{maxUsers:-1}});
                    if(couponData.discountType == "Fixed rate"){
                        const finalDiscount= (couponData.discountAmount)+Number(discount);
                        const reducedPrice= Math.round(amount-finalDiscount);
                        return res.json({amountOkey:true,finalDiscount,reducedPrice});
                    }else if(couponData.discountType == "Percentage type"){
                        const couponDiscount = (couponData.discountAmount * amount)/100;
                        const finalDiscount = Number(discount)+couponDiscount;
                        const reducedPrice = Math.round(amount-finalDiscount);
                        return res.json({amountOkey:true,finalDiscount,reducedPrice});
                    }else{
                        const couponDiscount= couponData.maxDiscountAmount;
                        const finalDiscount = Number(discount)+couponDiscount;
                        const reducedPrice= Math.round(amount-finalDiscount);
                        return res.json({amountOkey:true,finalDiscount,reducedPrice});
                    }
                }
            }
        }
    } catch (error) {
      console.error(error);
    }
}
const removeCoupon = async(req,res)=>{
    try {
        const couponValue = req.body.couponValue;
        let couponRemoved = false; 
        const couponData = await Coupon.findOne({code:couponValue});
        console.log(couponData);
        for(const user of couponData.user){
            if(user == req.session.user_id){
                await Coupon.findOneAndUpdate({code:couponValue},{$pull:{user}});
                couponRemoved = true;
                break;
            }
        }
        if(couponRemoved)
            res.json({couponRemoved:true});
        else
            res.json({couponRemoved:false});
    } catch (error) {
        console.error(error);
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