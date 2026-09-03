const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer =require('../model/productOfferModel');
const Category =require('../model/categoryModel');
const Product = require('../model/productModel');
const RefferalOffer = require('../model/referalOfferModel');
const getPagination = require("../helper/pagination");

const buildSearchFilter = (search='')=>({
    status:"Active",
    name:{
        $regex:search,
        $options:"i"
    }
});
const deleteOffer = async (Model,id)=>{
    return Model.findByIdAndDelete(id);
}
const buildOfferData = ({
    offerName,
    discountPercentage,
    startDate,
    endDate,
    status
}) => ({
    name: offerName.trim(),
    discountPercentage: Number(discountPercentage),
    startDate,
    endDate,
    status
});
const allOffers= async(req,res)=>{
    try {
        res.render('./admin/offers');
    } catch (error) {
        console.error(error);
        return res.status(500).render("error", {message: "Internal Server Error"});
    }
}
const loadCategoryOffer = async (req,res)=>{
    try {
        let search= req.query.search ||'';
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const filter = buildSearchFilter(search);
        const pagination =await getPagination(CategoryOffer,page,itemsPerPage,filter);
        const today = new Date();
        await CategoryOffer.updateMany({
                endDate: { $lt: new Date() },
                status: "Active"
                },
                {
                $set: { status: "Inactive" }
                }
            );
        const categoryOffers = await CategoryOffer.find(filter).populate('category').sort({startDate:-1}).skip(pagination.startIndex).limit(pagination.itemsPerPage).lean();
        res.render('./admin/categoryOffers',{categoryOffers,totalPages:pagination.totalPages,currentPage:pagination.currentPage});
    } catch (error) {
        console.error(error);
        return res.status(500).render("error", {message: "Internal Server Error"});
    }
}
const loadAddCategoryOffer = async (req,res)=>{
    try {
        const category= await Category.find({},'categoryName').lean();
        res.render('./admin/addCategoryOffer',{category});
    } catch (error) {
         console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}

const addCategoryOffer = async( req,res)=>{
    try {
    const {category} = req.body;
     const categoryOffer = new CategoryOffer({
            ...buildOfferData(req.body),
            category
        });       
    await categoryOffer.save();
    res.redirect('/admin/categoryOffers');
    } catch (error) {
        console.error(error);
         return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const viewCategoryOffer=async(req,res)=>{
    try {
        const offerId = req.query.id;
        const offerDetails= await CategoryOffer.findById(offerId).populate("category","categoryName").lean();
        res.render('./admin/viewCategoryOffer',{categoryOffer:offerDetails});
    } catch (error) {
        console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const editCategoryOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        const [category,offerDetails] = await Promise.all([
            Category.find({},"categoryName").lean(),
            CategoryOffer.findById(offerId).lean()
        ]) ;
        res.render('./admin/editCategoryOffer',{categoryOffer:offerDetails,category});
    } catch (error) {
      console.error(error);  
    }
}
const updateCategoryOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        const {category} = req.body;
        await CategoryOffer.findByIdAndUpdate(offerId,
            {$set:{
                ...buildOfferData(req.body),category
            }},
            {
                runValidators: true,
                new: true
            })        
        res.redirect('/admin/categoryOffers');
    } catch (error) {
        console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const deleteCategoryOffer = async (req,res)=>{
    try{
        const offerId = req.query.id;
        await deleteOffer(CategoryOffer,offerId);
        res.redirect('/admin/categoryOffers');
    }catch(error){
        console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const loadProductOffer = async (req,res)=>{
    try {
        let search=req.query.search || '';
         const page = parseInt(req.query.page,10) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage,10) || 10;
        const filter = buildSearchFilter(search);
        const pagination =await getPagination(ProductOffer,page,itemsPerPage,filter);
        const today = new Date();
        await ProductOffer.updateMany({
                endDate: { $lt: new Date() },
                status: "Active"
                },
                {
                $set: { status: "Inactive" }
                }
            );
        const productOffers = await ProductOffer.find(filter).populate('product',"Name").sort({startDate:-1}).skip(pagination.startIndex).limit(pagination.itemsPerPage).lean();
        
        res.render('./admin/productOffers',{productOffers,totalPages:pagination.totalPages,currentPage:pagination.currentPage});
    } catch (error) {
         console.error(error);
          return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const loadAddProductOffer = async (req,res)=>{
    try {
        const productlist= await Product.find({},"Name").lean();
        res.render('./admin/addProductOffer',{productlist});
    } catch (error) {
        console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}

const addProductOffer = async( req,res)=>{
    try {
    const {product} = req.body;
    const productOffer = new ProductOffer({
       ...buildOfferData(req.body),product
    })        
    await productOffer.save();
    res.redirect('/admin/productOffers');
    } catch (error) {
         console.error(error);
          return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const viewProductOffer=async(req,res)=>{
    try {
        const offerId = req.query.id;
        const offerDetails= await ProductOffer.findById(offerId).populate('product',"Name").lean();
        res.render('./admin/viewProductOffer',{productOffer:offerDetails});
    } catch (error) {
        console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const editProductOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        const [productlist,offerDetails]= await Promise.all([
                    Product.find({}, "Name").lean(),
                    ProductOffer.findById(offerId).lean()
        ]);
        res.render('./admin/editProductOffer',{productOffer:offerDetails,productlist});
    } catch (error) {
      console.error(error);  
      return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const updateProductOffer = async(req,res)=>{
    try {
        const offerId = req.query.id;
        const {product} = req.body;
        await ProductOffer.findByIdAndUpdate(offerId,
            {$set:{
                ...buildOfferData(req.body),product
            }},
            {
                runValidators: true,
                new: true
            })        
        res.redirect('/admin/productOffers');
    } catch (error) {
        console.error(error);
         return res.status(500).render("error", { message: "Internal Server Error"});
    }
}
const deleteProductOffer = async (req,res)=>{
    try{
        const offerId = req.query.id;
         await deleteOffer(ProductOffer,offerId);
        res.redirect('/admin/productOffers');
    }catch(error){
        console.error(error);
        return res.status(500).render("error", { message: "Internal Server Error"});
    }
}


module.exports ={
    allOffers,loadCategoryOffer,loadAddCategoryOffer,addCategoryOffer,viewCategoryOffer,editCategoryOffer,updateCategoryOffer,deleteCategoryOffer,
    loadProductOffer,loadAddProductOffer,addProductOffer,viewProductOffer,editProductOffer,updateProductOffer,deleteProductOffer
}