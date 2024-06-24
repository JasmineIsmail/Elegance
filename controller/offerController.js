const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer =require('../model/productOfferModel');
const Category =require('../model/categoryModel');
const Product = require('../model/productModel');
const RefferalOffer = require('../model/referalOfferModel');
// LOAD ALL OFFERS

const allOffers= async(req,res)=>{
    try {
        res.render('./admin/offers');
        
    } catch (error) {
        console.error(error);
    }
}

const loadCategoryOffer = async (req,res)=>{
    try {
        let search='';
        if(req.query.search){
        search=req.query.search;
        }
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalCategoryOffers = await CategoryOffer.countDocuments({});
        const totalPages = Math.ceil(totalCategoryOffers/itemsPerPage);
        const categoryOffers = await CategoryOffer.find({status:"Active",$or:[{name:{$regex:'.*'+search+'.*',$options:'i'}}]}).populate('category').sort({startDate:-1}).skip(startIndex).limit(itemsPerPage);
        res.render('./admin/categoryOffers',{categoryOffers,totalPages,currentPage:page});
    } catch (error) {
        console.log(error.message);
    }
}


const loadAddCategoryOffer = async (req,res)=>{
    try {
        const category= await Category.find();
        res.render('./admin/addCategoryOffer',{category});
    } catch (error) {
        console.log(error.message);
    }
}

const addCategoryOffer = async( req,res)=>{
    try {
    const {category,offerName,discountPercentage,startDate,expiryDate,status} = req.body;
    console.log(req.body);
    const categoryName = await Category.findOne({categoryName:category});
    const categoryOffer = new CategoryOffer({
        name:offerName,
        category:categoryName._id,
        discountPercentage:discountPercentage,
        startDate:startDate,
        endDate:expiryDate,
        status:status
    })        
    await categoryOffer.save();
    res.redirect('/admin/categoryOffers');
    } catch (error) {
        console.log(error.message);
    }
}
const viewCategoryOffer=async(req,res)=>{
    try {
        const offerId = req.query.id;
        const offerDetails= await CategoryOffer.findById({_id:offerId});
        res.render('./admin/viewCategoryOffer',{categoryOffer:offerDetails});
    } catch (error) {
        console.error(error);
    }
}
const editCategoryOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        console.log("offerId",offerId);
        const category = await Category.find();
        const offerDetails= await CategoryOffer.findById({_id:offerId});
        res.render('./admin/editCategoryOffer',{categoryOffer:offerDetails,category});
    } catch (error) {
      console.error(error);  
    }
}
const updateCategoryOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        const {category,offerName,discountPercentage,startDate,expiryDate,status} = req.body;
        const categoryName = await Category.findOne({categoryName:category});
        await CategoryOffer.findByIdAndUpdate({_id:offerId},{$set:{
            name:offerName,
            category:categoryName._id,
            discountPercentage:discountPercentage,
            startDate:startDate,
            endDate:expiryDate,
            status:status
        }})        
        res.redirect('/admin/categoryOffers');
    } catch (error) {
        console.error(error);
    }
}
const deleteCategoryOffer = async (req,res)=>{
    try{
        const offerId = req.query.id;
        console.log(offerId);
        await CategoryOffer.deleteOne({_id:offerId});
        res.redirect('/admin/categoryOffers');
    }catch(error){
        console.log(error.message);
    }
}
const loadProductOffer = async (req,res)=>{
    try {
        let search='';
        if(req.query.search){
        search=req.query.search;
        }
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalProductOffers = await ProductOffer.countDocuments({});
        const totalPages = Math.ceil(totalProductOffers/itemsPerPage);
        const productOffers = await ProductOffer.find({status:"Active",$or:[{name:{$regex:'.*'+search+'.*',$options:'i'}}]}).populate('product').sort({startDate:-1}).skip(startIndex).limit(itemsPerPage);
        res.render('./admin/productOffers',{productOffers,totalPages,currentPage:page});
    } catch (error) {
        console.log(error.message);
    }
}


const loadAddProductOffer = async (req,res)=>{
    try {
        const productlist= await Product.find();
        res.render('./admin/addProductOffer',{productlist});
    } catch (error) {
        console.log(error.message);
    }
}

const addProductOffer = async( req,res)=>{
    try {
    const {product,offerName,discountPercentage,startDate,expiryDate,status} = req.body;
    console.log(req.body);
   // const productName = await Product.findOne({Name:{$regex:productType,options,i}});
   // console.log("products",productName);
    const productOffer = new ProductOffer({
        name:offerName,
        product:product,
        discountPercentage:discountPercentage,
        startDate:startDate,
        endDate:expiryDate,
        status:status
    })        
    await productOffer.save();
    res.redirect('/admin/productOffers');
    } catch (error) {
        console.log(error.message);
    }
}
const viewProductOffer=async(req,res)=>{
    try {
        const offerId = req.query.id;
        const offerDetails= await ProductOffer.findById({_id:offerId}).populate('product');
        res.render('./admin/viewProductOffer',{productOffer:offerDetails});
    } catch (error) {
        console.error(error);
    }
}
const editProductOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        console.log("offerId",offerId);
        const offerDetails= await ProductOffer.findById({_id:offerId});
        res.render('./admin/editProductOffer',{productOffer:offerDetails});
    } catch (error) {
      console.error(error);  
    }
}
const updateProductOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        const {productType,offerName,discountPercentage,startDate,expiryDate,status} = req.body;
        await ProductOffer.findByIdAndUpdate({_id:offerId},{$set:{
            name:offerName,
            productType:productType,
            discountPercentage:discountPercentage,
            startDate:startDate,
            endDate:expiryDate,
            status:status
        }})        
        res.redirect('/admin/productOffers');
    } catch (error) {
        console.error(error);
    }
}
const deleteProductOffer = async (req,res)=>{
    try{
        const offerId = req.query.id;
        console.log(offerId);
        await ProductOffer.deleteOne({_id:offerId});
        res.redirect('/admin/productOffers');
    }catch(error){
        console.log(error.message);
    }
}
const loadRefferalOffer = async (req,res)=>{
    try {
        const refferalOffers = await RefferalOffer.find();
        res.render('./admin/referalOffers',{refferalOffers});
    } catch (error) {
        console.log(error.message);
    }
}
const loadAddRefferalOffer = async (req,res)=>{
    try {
        
        res.render('./admin/addRefferalOffer');
    } catch (error) {
        console.log(error.message);
    }
}

const addRefferalOffer = async( req,res)=>{
    try {
    const {refferalCode,discountPercentage,startDate,expiryDate,status} = req.body;
    console.log(req.body);
    const referalOffer = new RefferalOffer({
        refferalCode:refferalCode,
        discountPercentage:discountPercentage,
        startDate:startDate,
        endDate:expiryDate,
        status:status
    })        
    await referalOffer.save();
    res.redirect('/admin/refferalOffers');
    } catch (error) {
        console.log(error.message);
    }
}
const viewRefferalOffer=async(req,res)=>{
    try {
        const offerId = req.query.id;
        const offerDetails= await RefferalOffer.findById({_id:offerId});
        res.render('./admin/viewRefferalOffer',{refferalOffer:offerDetails});
    } catch (error) {
        console.error(error);
    }
}
const deleteRefferalOffer = async (req,res)=>{
    try{
        const offerId = req.query.id;
        console.log(offerId);
        await RefferalOffer.deleteOne({_id:offerId});
        res.redirect('/admin/refferalOffers');
    }catch(error){
        console.log(error.message);
    }
}
module.exports ={
    allOffers,loadCategoryOffer,loadAddCategoryOffer,addCategoryOffer,viewCategoryOffer,editCategoryOffer,updateCategoryOffer,deleteCategoryOffer,
    loadProductOffer,loadAddProductOffer,addProductOffer,viewProductOffer,editProductOffer,updateProductOffer,deleteProductOffer,
    loadRefferalOffer,loadAddRefferalOffer,addRefferalOffer,viewRefferalOffer,deleteRefferalOffer
}