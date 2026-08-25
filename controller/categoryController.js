const Categories = require("../model/categoryModel");
const getPagination = require("../helper/pagination");

//  load Categories
const loadCategories = async (req, res) => {
  try {
     const filter = {is_valid : true}
    const pagination = await getPagination(Categories,req.query.page,req.query.itemsPerPage,filter);     
    const categoryData = await Categories.find(filter).skip(pagination.skip).limit(pagination.itemsPerPage);
    res.render("./admin/categories", {categoryData ,totalPages:pagination.totalPages,currentPage:pagination.currentPage});
  } catch (error) {
    console.error(error);
    res.status(500).send("internal Server Error");
  }
};
// load add category page
const addCategory = async(req,res)=>{
  try {
    res.render("./admin/addCategory");
  } catch (error) {
    console.error(error);
    res.status(500).send("internal Server Error");
  }
}
// upload Category
const loadAddCategory = async (req, res) => {
  try {
    const {categoryName,description}= req.body;
      if (!categoryName?.trim() || !description?.trim()) {
      return res.render("./admin/addCategory", {
        message: "All fields are required.",
      });
    }
    const existingCategory = await Categories.findOne({
      categoryName :{
          $regex: new RegExp(`^${categoryName.trim()}$`, "i"),
      },
      is_valid:true
    });
    if(existingCategory){
      return res.render('./admin/addCategory',{message:"Category already exist!!"});
    }
    await Categories.create({
        categoryName: categoryName.trim(),
        description: description.trim(),
        is_valid: true
    })
    res.redirect("/admin/viewCategories");
  } catch (error) {
    console.error(error);
      res.status(500).render("./admin/addCategory", {
      message: "Something went wrong.",
    });
  }
};
//EDIT CATREGORY
const editCategory = async(req,res)=>{
  try {
    const categoryData = await Categories.findById(req.query.id);
    
    if(categoryData){
      res.render('./admin/editCategory',{categoryData:categoryData});
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("./admin/addCategory",{
      message:"Something went wrong"
    });
  }
}
// UPDATE CATEGORY

const updateCategory = async(req,res)=>{
  try {
    const categoryData=await Categories.findByIdAndUpdate(req.query.id,
      {$set:
        {categoryName:req.body.categoryName,
          description:req.body.description}});
      console.log(categoryData);
       res.redirect("/admin/viewCategories");
    }catch (error) {
    console.error(error.message);
  }
}


//delete Category
const deleteCategory = async (req, res) => {
  try {
    const categoryData = await Categories.findByIdAndUpdate(req.query.id,{$set: {is_valid: false}})
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
}
