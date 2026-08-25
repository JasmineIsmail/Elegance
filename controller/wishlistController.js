const Wishlist = require('../model/wishlistModel');
const Product = require('../model/productModel');
const Cart = require('../model/cartModel');
const User = require('../model/userModel');
// Add to wishlist
const addToWishlist = async(req,res)=>{
    try{
        const userId = req.session.user_id;
        const productId = req.query.id?.trim();
        if(!userId){
            return res.redirect("/login");
        }
        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).json({
                    success: false,
                    message: "Product not found"
            });
        }
        const wishlist = await Wishlist.findOne({userName:userId});
        if(wishlist){
            const alreadyExist = await wishlist.products.some(product=> product.productId.toString===productId);
            if(alreadyExist){
                return res.json({
                    success : false,
                    exist:true,
                    message : "product already in whishlist"
                })
            }
            wishlist.products.push({productId});
            await wishlist.save();
            return res.json({success :true,  message: "Product added to wishlist"})
        }
        await Wishlist.create({
                userName:userId,
                products:[{
                    productId : productId
                }]
            })
            return res.json({success :true,   message: "Product added to wishlist"})
    }catch(error){
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
}


//VIEW WISHLIST
const viewWishlist = async(req,res)=>{
    try {
        const wishlist = await Wishlist.findOne({userName:req.session.user_id}).populate("products.productId").lean();
        if(!wishlist||wishlist.products.length === 0){
            return res.render('./users/emptyWishlist',{message:"No product in wishlist!!"});
        }
        const products= wishlist.products.filter( item => item.productId)
        return    res.render('./users/wishlist',{products});
        
    } catch (error) {
        console.error(error);
        res.redirect("/");
    }
}
// REMOVE FROM WISHLIST 
const removeWishlist = async (req,res)=>{
    try{
        const productId = req.query.id;
        const wishlist = await Wishlist.findOne({userName:req.session.user_id});
        if(!wishlist){
            return res.redirect("/wishlist")
        }
        wishlist.products= wishlist.products.filter(item => !item.productId.equals(productId));
        if(wishlist.products.length===0){
            await wishlist.deleteOne({_id:wishlist._id});
        }else{
         await wishlist.save()   ;
        }
        return res.redirect('/wishlist');
    }catch(error){
        console.error(error);
        res.redirect("/wishlist");
    }
}

// ADD FROM WISHLIST TO CART
const addFromWishlist = async (req,res)=>{
    try{
        const productId = req.query.id?.trim();
        const userId = req.session.user_id;
        if(!userId){
            res.redirect("/login");
        }
        const product = await Product.findById(productId).lean();
        if(!product){
            return res.status(404).json({
                success: false,
                message: "product not found"
            })
        }
        let cart= await Cart.findOne({userName:userId});
        if(!cart){
            cart = await Cart.create({
                userName :userId,
                products :[{
                    productId,
                    productPrice:product.price,
                    offerPrice : product.offerPrice||product.price,
                    count:1
                }]
            });
        }else{
            const cartProduct = cart.products.find(item => item.productId.equals(productId));
            if(cartProduct){
                cartProduct.count++;
            }else{
                cart.products.push({
                    productId,
                    productPrice:product.price,
                    offerPrice : product.offerPrice||product.price,
                    count:1
                })
                await cart.save();
            }
        }
        const wishlist = await Wishlist.findOne({userName: userId});
        if(wishlist){
             wishlist.products = wishlist.products.filter(item =>!item.productId.equals(productId));
        }
        if (wishlist.products.length === 0) {
                await Wishlist.deleteOne({_id: wishlist._id});
        }else {
                await wishlist.save();

            }
        return res.redirect("/viewCart");
    }catch(error){
        console.error(error);
        return res.redirect("/wishlist");
    }
}

module.exports={
    addToWishlist,
    viewWishlist,
    removeWishlist,
    addFromWishlist
}