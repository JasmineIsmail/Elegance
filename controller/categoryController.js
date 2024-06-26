const Categories = require("../model/categoryModel");
const path = require("path");


//  load Categories
const loadCategories = async (req, res) => {
  try {
    const admin = req.session.admin_id;
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 8;
    const startIndex= (page-1)* itemsPerPage;
    const endIndex=page*itemsPerPage;
    const totalCategories = await Categories.countDocuments({});
    const totalPages = Math.ceil(totalCategories/itemsPerPage);     
    const categoryData = await Categories.find({}).skip(startIndex).limit(itemsPerPage);
    res.render("./admin/categories", {categoryData: categoryData ,totalPages,currentPage:page});
  } catch (error) {
    console.log(error.message);
  }
};
// add category
const addCategory = async(req,res)=>{
  try {
    const categoryData = await Categories.find({});
    res.render("./admin/addCategory");
  } catch (error) {
    console.error(error);
  }
}
// upload Category
const loadAddCategory = async (req, res) => {
  try {
    if(existingCategory.length > 0){
      console.log("hiiii");
      res.render('./admin/addCategory',{message:"Category already exist!!"});
    }else{
      const categoryData = new Categories({
        categoryName : req.body.categoryName,
        description : req.body.description,
        catImage : req.file.filename,
        is_valid:1
        });
      const savedCategory = await categoryData.save();
    if (savedCategory) {
      res.redirect("/admin/viewCategories");
    } else {
      console.log("error while uploading data of categories");
    }
  }
  } catch (error) {
    console.log("Error occurred while loading Add categories",error);
  }
};
//EDIT CATREGORY
const editCategory = async(req,res)=>{
  try {
    const categoryData = await Categories.findById({_id:req.query.id});
    
    if(categoryData){
      res.render('./admin/editCategory',{categoryData:categoryData});
    }
  } catch (error) {
    console.log(error.message);
  }
}
// UPDATE CATEGORY

const updateCategory = async(req,res)=>{
  try {
    const categoryData=await Categories.findByIdAndUpdate({_id:req.query.id},{$set:{categoryName:req.body.categoryName,description:req.body.description}});
      console.log(categoryData);
       res.redirect("/admin/viewCategories");
    }catch (error) {
    console.log(error.message);
  }
}


//delete Category
const deleteCategory = async (req, res) => {
  try {
    const categoryData = await Categories.findByIdAndUpdate({ _id: req.query.id },{$set: {is_valid: 0}})
      .exec();
      res.redirect("/admin/viewCategories");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadCategories,
  loadAddCategory,
  editCategory,
  deleteCategory,
  updateCategory,
  addCategory
};
