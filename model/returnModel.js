const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    orderId:{
        type:String,
        ref:'Order',
        required:true,

    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true,
    },
    reason:{
        type:String,
    },
    status:{
        type:String,
        default:'pending',
    },
    createdAt:{
        type:Date,
        default:Date.now(),
    },
    
})

const ReturnProduct = mongoose.model('ReturnProduct',returnSchema);

module.exports = ReturnProduct;
