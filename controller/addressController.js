const Address= require('../model/addressModel');
const User = require('../model/userModel');
const Cart = require('../model/cartModel');
const Product= require('../model/productModel');
const Coupon = require('../model/couponModel');
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');

const calculateDiscountedPrice = (price, discountPercentage) => {
    return price - (price * discountPercentage) / 100; // For percentage-based discount
  };

const attachOfferPrices = async (products) => {

    if (!products.length) return products;

    const productIds = products.map(product => product._id);
    const categoryIds = [
        ...new Set(products.map(product => product.category.toString()))
    ];
    const [categoryOffers, productOffers] = await Promise.all([
        CategoryOffer.find({category: { $in: categoryIds }}).lean(),
        ProductOffer.find({product: { $in: productIds }}).lean()
    ]);

    const categoryOfferMap = new Map();
    categoryOffers.forEach(offer => {
        categoryOfferMap.set(
            offer.category.toString(),
            offer.discountPercentage
        );
    });

    const productOfferMap = new Map();
    productOffers.forEach(offer => {
        productOfferMap.set(
            offer.product.toString(),
            offer.discountPercentage
        );
    });
    return products.map(product => {
        const categoryDiscount = categoryOfferMap.get(product.category.toString());
        const productDiscount =productOfferMap.get(product._id.toString());
        let offerPrice = product.price;
        if (categoryDiscount && productDiscount) {
            offerPrice = Math.min(
                    calculateDiscountedPrice(product.price,categoryDiscount),
                    calculateDiscountedPrice(product.price,productDiscount)
                );
        } else if (categoryDiscount) {
            offerPrice = calculateDiscountedPrice(product.price,categoryDiscount);
        } else if (productDiscount) {
            offerPrice = calculateDiscountedPrice(product.price,productDiscount);
        }
        return {
            ...product.toObject(),
            offerPrice: Math.floor(offerPrice)
        };
    });
};

//LOAD CHECKOUT PAGE
const checkout = async(req,res)=>{
    try {
        const userId= req.session.user_id;
        const [user,addressData,cartData,coupons] = await Promise.all([
                    User.findById(userId).lean(),
                    Address.findOne({userId:userId}).lean(),
                    Cart.findOne({userName:userId}).lean(),
                    Coupon.find({expiryDate: {$gte: new Date()}}).lean()
            ]);
        if(!cartData || cartData.products.length === 0){
            return res.redirect("/viewCart");
        }
        const productIds = cartData.products.map(item => item.productId);
        let productData = await Product.find({_id:{$in:productIds}});
            productData= await attachOfferPrices(productData);
        const productMap = new Map();
        productData.forEach(product => {
            productMap.set(
                product._id.toString(),
                product
            );
        });
        let total = 0;
        let reducedAmount = 0;
        cartData.products.forEach(item => {
            const product = productMap.get(item.productId.toString());
            if (!product) return;
            total += item.productPrice * item.count;
            reducedAmount += product.offerPrice * item.count;
        });
        const totalDiscount = total - reducedAmount;
        const userAddress = addressData ? addressData.addresses : [];
        res.render("./users/checkout", {user,userAddress,cartData,productData,coupons,total,reducedAmount,totalDiscount});
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");}
};
// ADD USER ADDRESS
const addAddress= async(req,res)=>{
    try {
        res.render('./users/addAddress');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

// SAVE USER ADDRESS
const saveAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const{name,mobile,alternativeMob,houseName,place,landmark,City,State,pin} =req.body;
        const newAddress = {name,mobile,alternativeMob,houseName,place,landmark,City,State,pin};
        const addressData = await Address.findOne({userId:userId});
        if(addressData){
            await Address.updateOne({userId:userId},
                {$push:{
                    addresses: newAddress
                }})
        }else{
            await Address.create({userId,
                addresses:[newAddress]
            });
        }
            res.redirect('/checkout');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const editAddress = async(req,res)=>{
    try {
        const addressId= req.query.id;
        const addressData = await Address.findOne({userId:req.session.user_id}); 
        if(!addressData){
            return res.redirect("/manage_address");
        }
        const selectedAddress = addressData.addresses.find(address => address._id.toString() === addressId);
        if(!selectedAddress){
            return res.redirect("/manage_address");
        }
        res.render('./users/editAddress',{selectedAddress});
    } catch (error) {
        console.error(error);
    }
}
const changeAddress = async(req,res)=>{
    try{
        const addressId = req.query.id;
        const addressData = await Address.findOne({userId:req.session.user_id});
        if(!addressData){
            return res.redirect("/manage_address");
        }
        const address = addressData.addresses.id(addressId);
        if (!address) {
            return res.status(404).send("Address not found");
        }
        address.name=req.body.name;
        address.mobile=req.body.mobile;
        address.alternativeMob=req.body.alternativeMob;
        address.houseName=req.body.houseName;
        address.place=req.body.place;
        address.landmark=req.body.landmark;
        address.City=req.body.City;
        address.State=req.body.State;
        address.pin=req.body.pin;
        await addressData.save();
        res.redirect('/user_profile');
    }catch(error){
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
module.exports={
    checkout,
    addAddress,
    saveAddress,
    editAddress,
    changeAddress
}