const mongoose = require('mongoose'); 


var refferalOfferSchema = new mongoose.Schema({
    refferalCode:{
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
module.exports = mongoose.model('RefferaltOffer', refferalOfferSchema);