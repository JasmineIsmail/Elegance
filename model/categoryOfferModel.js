const mongoose = require('mongoose'); 


var categoryOfferSchema = new mongoose.Schema({
    
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Categories',
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    discountPercentage:{
        type:Number,
        required:true,
    },
    startDate:{
        type:Date,
        required:true,
    },
    endDate:{
        type:Date,
        required:true,
    },
    status:{
        type:String,
        default:"Active",
    }
});



//Export the model
module.exports = mongoose.model('categoryOffer', categoryOfferSchema);