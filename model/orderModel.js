const mongoose= require('mongoose');
const orderSchema= new mongoose.Schema({
    order_Id:{
        type:String,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    userAddress:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Address',
        refPath:"addresses",
        required:true
    },
    paymentMethod:{
        type:String,
        required:true
    },
    paymentId:{
        type:String
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        count:{
            type:Number,
            required:true
        },
        productPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:'Pending'
        },
    }],
    Amount:{
        type:Number,
        required:true
    },
    date:{
        type:Date
    },
    status: {
        type: String,
        default: 'Pending',
        required: true
    } ,
    discount:{
        type:Number
    }
})
const orderModel = mongoose.model("order",orderSchema);
module.exports = orderModel;