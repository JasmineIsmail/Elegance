const mongoose = require("mongoose");
const categorySchema = mongoose.Schema({
    categoryName:{
        type:String,
        required:true
    },
    description:{
        type:String
    },
    catImage:{
        type:String,
        required:true
    },
    is_valid:{
        type:Number,
        default:1
    }
});

module.exports = mongoose.model("Categories",categorySchema);
