const mongoose = require("mongoose");
const categorySchema = mongoose.Schema({
    categoryName:{
        type:String,
        required:true,
        trim:true
    },
    description:{
        type:String,
        trim:true
    },
    catImage:{
        type:String,
        //required:true
    },
    is_valid:{
        type:Boolean,
        default:true
    }},
    {
        timestamps :true
    }
);

module.exports = mongoose.model("Categories",categorySchema);
