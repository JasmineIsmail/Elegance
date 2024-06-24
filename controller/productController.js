const { errorMonitor } = require("nodemailer/lib/xoauth2");
const Categories = require("../model/categoryModel");
const Product= require("../model/productModel");

const viewProducts = async(req,res)=>{
    try {
        let search='';
        if(req.query.search){
          search=req.query.search;
        }
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalProductsCount = await Product.countDocuments({});
        const totalPages = Math.ceil(totalProductsCount/itemsPerPage);
        
        const productsData = await Product.find({status:true,$or:[{Name:{$regex:'.*'+search+'.*',$options:'i'}}]}).sort({createdAt:-1}).skip(startIndex).limit(itemsPerPage);
        res.render("./admin/listProducts",{products:productsData,totalPages,currentPage:page,itemsPerPage});
      } catch (error) {
        console.log("productlist not loading")
        res.render('./admin/dashboard');
    }
}
const addProduct = async(req,res)=>{
    try {
      const admin = req.session.admin_id;
       const categoryData = await Categories.find({},{'categoryName':1,'_id':0});
       res.render("./admin/addProduct", { admin: admin, category: categoryData ,error:{},values:{}});
      } catch (error) {
        console.error("Error occurred while loading Add products:", error);
        res.status(500).send("Error occurred while loading Add products.");
      }
}
const uploadProduct = async(req,res)=>{
    try {
        let images = [];
        let error={};
        let isValid= true;
        const categoryNames = await Categories.find({},{'categoryName':1,'_id':0});
        const { Name, description, price,category,quantity} = req.body;
        const values = { Name, description, price, category, quantity };
        
        const categoryData = await Categories.findOne({categoryName:category});
       
        if(! /^[A-Z a-z][a-z A-Z \s]*[a-z]$/.test(Name) ){
            isValid = false;
            error.Name = "Product name should contain only letters and spaces, and must not start or end with a space.";
        }else if(Name.length <4){
          isValid =false;
          error.nameLength = "Product name should have minimum length 4";
        }
        if(! /^[A-Z a-z][A-Z a-z \d\s\(\)\-\,\.\&]*$/.test(description.trim())){
          isValid=false;
          error.description="Description can letters and numbers and cannot be just spaces.";
        }else if(description.length<5){
          isValid = false;
          error.descriptionLength = "Description should have a minimum length of 5";
        } if (!/^\d+(\.\d+)?$/.test(price)) {
          isValid = false;
          error.price = "Price should be a number.";
        }
        if(price <=0){
          isValid =false;
          error.negativePrice=" price should be grater than zero";
        }
        if (!/^\d+(\.\d+)?$/.test(quantity)) {
          isValid = false;
          error.quantity = "Quantity should be a number.";
        }
        if(quantity <=0){
          isValid=false;
          error.negativeQuantity= "Quantity should be greater than zero."
        }
        console.log("error:",error);
        if(isValid == false) {
          res.render("./admin/addProduct",{category: categoryNames,error,values});
          return;
        }
        for (let i = 0; i < req.files.length; i++) {
          images[i] = req.files[i].filename;
          console.log(req.files[i].filename);
        }
          const productData = new Product({
            Name:Name,
            description:description,
            price:price,
            category:categoryData._id,
            productQuantity:quantity,
            images: images,
          });
          const saveProdData = await productData.save();
          if (saveProdData) {
            res.redirect("/admin/viewproducts");
          }
        
       
      } catch (error) {
        console.error("Error occurred while loading Adding products:", error);
        res.status(500).send("Error occurred while loading Adding products.");
      }
}
//EDIT PRODUCT
const editProduct = async(req,res)=>{
  try {
    const productData = await Product.findById({_id:req.query.id}).populate('category');
    const categoryData = await Categories.find({},{'categoryName':1,'_id':0});
    if(productData){
      res.render('./admin/editProduct',{productData:productData,category:categoryData});
    }
  } catch (error) {
    console.log(error.message);
  }
}
//IMAGE REPLACE IN EDIT PRODUCT
const imageReplace = async(req,res)=>{
  try {
    const {productId,imageIndex}=req.body;
    const productData = await Product.findById(productId);
    productData.images[imageIndex]= req.file.filename;
    await productData.save();
    res.json({updatedFilename: req.file.filename});
  } catch (error) {
    console.error(error);
  }
}
const deleteImage = async (req , res) => {
  try {
      const { id , img } = req.query;
      const productData = await Product.findByIdAndUpdate(id , { $pull : { images : img }} , { new: true });
      res.redirect(`/admin/edit_product?id=${productData._id}`)
  } catch (error) {
      console.log(error.message);
  }
}
// PRODUCT PROFILE
const loadProductprofile = async(req,res)=>{
  try {
      const findProduct = await Product.findById({ _id: req.query.id });
      const category = findProduct.category;
      const categoryName = await Categories.findById({_id:category});
      res.render('./admin/productProfile',{product:findProduct,categoryName});
  } catch (error) {
     console.log(error.message);
  }
}

// UPDATE PRODUCT

const updateProduct = async(req,res)=>{
  try {
    
    //const {Name, description, price,category,sizes,color,quantity} = req.body;
    const updates = req.body;
    console.log(updates);
    if(updates.category){
      var categoryData= await Categories.findOne({categoryName:updates.category});
    }
   
await Product.findByIdAndUpdate({ _id: req.query.id },{$set:
        {Name:updates.Name,
        description:updates.description,
        price:updates.price,
        category:categoryData._id,
         productQuantity:updates.quantity}});
      
       res.redirect("/admin/viewProducts");
    }catch (error) {
    console.log(error.message);
  }
}


//DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    
    const productData = await Product.findByIdAndUpdate({ _id: req.query.id },{$set: {status:false}})
      .exec();
      
      res.redirect("/admin/viewProducts");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
   viewProducts,
   addProduct,
   uploadProduct,
   editProduct,
   loadProductprofile,
   deleteProduct,
   updateProduct,
   imageReplace,
   deleteImage
}