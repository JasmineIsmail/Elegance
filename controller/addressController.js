const Address= require('../model/addressModel');
const User = require('../model/userModel');
const Cart = require('../model/cartModel');
const Product= require('../model/productModel');
const Coupon = require('../model/couponModel');
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');
//LOAD CHECKOUT PAGE
const checkout = async(req,res)=>{
    try {
        const userId= req.session.user_id;
        const user = await User.findOne({_id:userId});
        const addressData= await Address.findOne({userId:req.session.user_id});
        const cartData = await Cart.findOne({userName:req.session.user_id});
        const products = cartData.products.map(product=>product.productId);
        const productData = await Product.find({_id:products});
        const coupons= await Coupon.find();
        let discountPerItem = [];
        let totalPerItem=[]
        for (const item of cartData.products) {
                const productData = await Product.findOne({_id:item.productId});
                const quantity= item.count;
                item.offerPrice = Math.floor(await checkAllOffer(productData));
                discountPerItem.push(quantity * item.offerPrice);
                totalPerItem.push(quantity*item.productPrice);
        }
        const reducedAmount = discountPerItem.reduce((acc,curr)=> acc+curr);
        const total =totalPerItem.reduce((acc,curr)=> acc+curr);
        const totalDiscount = total-reducedAmount;
        if(addressData){
            const userAddress = addressData.addresses;
            res.render('./users/checkout',{userAddress,productData,products,cartData,coupons,totalDiscount,reducedAmount,total}); 
        }else{
            res.redirect('/add_address');}
    } catch (error) {
        console.error(error);
    }
}

const checkAllOffer = async (product)=>{
    const categoryOffer = await CategoryOffer.findOne({category:product.category});
    const productOffer = await ProductOffer.findOne({product:product._id});
    if(categoryOffer){
        return  categoryOfferPrice= calculateDiscountedPrice(product.price,categoryOffer.discountPercentage)
    }else if(productOffer){
      return productOfferPrice =calculateDiscountedPrice(product.price,productOffer.discountPercentage)
    }else if(categoryOffer && productOffer){
          return (categoryOfferPrice  > productOfferPrice)?categoryOfferPrice :productOfferPrice;
    }else {
       return product.price; // No offer price
    }
  }
  
  const calculateDiscountedPrice = (originalPrice, discountValue) => {
    return originalPrice - (originalPrice * discountValue) / 100; // For percentage-based discount
  };

// ADD USER ADDRESS
const addAddress= async(req,res)=>{
    try {
        res.render('./users/addAddress');
    } catch (error) {
        console.error(error);
    }
}

// SAVE USER ADDRESS
const saveAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const{name,mobile,alternativeMob,houseName,place,landmark,City,State,pin} =req.body;
        const userData = await User.findOne({_id:userId});
        const addressDetails = await Address.findOne({userId:req.session.user_id});
        if(addressDetails){
            await Address.updateOne({userId:req.session.user_id},
                {$push:{
                    addresses:{
                            name: name,
                            mobile:mobile,
                            alternativetMob: alternativeMob,
                            houseName: houseName,
                            place: place,
                            landmark:landmark,
                            City: City,
                            State: State,
                            pin: pin
                    }
                }})
        }else{
            const addressDetails = new Address({
                userId: req.session.user_id,
    
                addresses:[{
                    name:name,
                    mobile:mobile,
                    alternativeMob:alternativeMob,
                    pin:pin,
                    houseName:houseName,
                    place:place,
                    landmark:landmark,
                    City:City,
                    State:State
                }]
            });
            const addressSaved = await addressDetails.save();
        }
            res.redirect('/checkout');
    } catch (error) {
        console.error(error);
    }
}
const editAddress = async(req,res)=>{
    try {
        const addressId= req.query.id;
        const addressData = await Address.findOne({userId:req.session.user_id}); 
        const selectedAddress = addressData.addresses.find(address => String(address._id) === addressId);
        res.render('./users/editAddress',{selectedAddress});
    } catch (error) {
        console.error(error);
    }
}
const changeAddress = async(req,res)=>{
    try{
        const addressId = req.query.id;
        const addressData = await Address.findOne({userId:req.session.user_id});
        const addressIndex = addressData.addresses.findIndex(address=>address._id==addressId);
        if(addressIndex!== -1){
            addressData.addresses[addressIndex].name=req.body.name;
            addressData.addresses[addressIndex].mobile=req.body.mobile;
            addressData.addresses[addressIndex].alternativeMob=req.body.alternativeMob;
            addressData.addresses[addressIndex].houseName=req.body.houseName;
            addressData.addresses[addressIndex].place=req.body.place;
            addressData.addresses[addressIndex].landmark=req.body.landmark;
            addressData.addresses[addressIndex].City=req.body.City;
            addressData.addresses[addressIndex].State=req.body.State;
            addressData.addresses[addressIndex].pin=req.body.pin;
            await addressData.save();
            res.redirect('/user_profile');
        }else{
            res.send('address not found');
        }
    }catch(error){
        console.error(error);
    }
}
module.exports={
    checkout,
    addAddress,
    saveAddress,
    editAddress,
    changeAddress
}