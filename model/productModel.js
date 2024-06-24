const mongoose= require("mongoose");

const productSchema = mongoose.Schema({
    Name:{
        type:String,
        required:true
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Categories',
        required:true
    },
    productQuantity:{
        type:Number,
       
    },
    description:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        
    },
    images:{
        type:Array,
        required:true
    },
    status:{
        type:Boolean,
        default:true
    },
    offerPrice:{
        type:Number
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }
})
module.exports=mongoose.model("Product",productSchema);
