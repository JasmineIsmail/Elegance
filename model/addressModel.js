const mongoose = require('mongoose');
const addressSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },  
    addresses:[{
        name:{
            type:String,
            required:true
        },
        mobile:{
            type:Number,
            required:true
        },
        alternativeMob:{
            type:Number,
            required:true
        },
        houseName:{
            type:String,
            required:true
        },
        place:{
            type:String,
            required:true
        },
        landmark:{
            type:String,
            //required:true
        },
        City:{
            type:String,
            required:true
        },
        State:{
            type:String,
            required:true
        },
        pin:{
            type:Number,
            required:true
        },
        oderMessage:{
            type:String,
        }
    }]
})

const addressModel = mongoose.model("address",addressSchema);
module.exports = addressModel;