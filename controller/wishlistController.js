const Wishlist = require('../model/wishlistModel');
const Product = require('../model/productModel');
const Cart = require('../model/cartModel');
const User = require('../model/userModel');
const productModel = require('../model/productModel');

// Add to wishlist
const addToWishlist = async(req,res)=>{
    try{
        const proId = req.query.id.trim();
        const user = await User.findOne({_id:req.session.user_id});
        const productData = await Product.findOne({_id:proId});
        const wishlistData = await Wishlist.findOne({userName:user._id});
        if(wishlistData){
            const checkWishlist = await wishlistData.products.findIndex((item)=> item.productId == proId);
            if(checkWishlist != -1){
                res.json({check:true})
            }else{
                await Wishlist.updateOne({userName:user._id},{$push:{products:{productId:proId}}});
                res.redirect('/users/wishlist');
            }
        }else{
            const wishlist = new Wishlist({
                userName:user._id,
                products:[{
                    productId:productData._id,
                    productName:productData.Name,
                    productPrice:productData.price
                }]
            })

            const wish = await wishlist.save();
           
            if(wish){
                res.redirect('/users/wishlist');
            }
        }
    }catch(error){
        console.log(error.message);
    }
}


//VIEW WISHLIST
const viewWishlist = async(req,res)=>{
    try {
        const user= await User.findOne({_id:req.session.user_id});
        const wishlistData = await Wishlist.findOne({userName:user._id}).populate("products.productId");
        if(! wishlistData){
            res.render('./users/emptyWishlist',{message:"No product in wishlist!!"});
        }else{
            const products = wishlistData.products;
            res.render('./users/wishlist',{products});
        }
    } catch (error) {
        console.log(error.message);
    }
}
// REMOVE FROM WISHLIST 
const removeWishlist = async (req,res)=>{
    try{
        const id = req.query.id;
        await Wishlist.deleteOne({userName:req.session.user_id});
        res.redirect('/users/wishlist');
    }catch(error){
        console.log(error.message);
    }
}

// ADD FROM WISHLIST TO CART
const addFromWishlist = async (req,res)=>{
    try{
        const productId = req.query.id;
        const userData = await User.findOne({_id:req.session.user_id});
        const productData = await Product.findOne({_id:productId});
        if(req.session.user_id){
            const userid = req.session.user_id;
            const cartData = await Cart.findOne({userName:userid});
            if(cartData){
                const productExist = await cartData.products.findIndex((product)=>
                    product.productId == productId
                )
                if(productExist != -1){
                    await Cart.updateOne({userName:userid,"products.productId":productId},{$inc:{"products.$.count":1}});
                    await Wishlist.updateOne({userName:userid},{$pull:{products:{productId:productId}}});
                    // res.json({success:true})
                    res.redirect('/users/viewCart');

                }else{
                    await Cart.findOneAndUpdate({userName:req.session.user_id},{$push:{products:{productId:productId,productPrice:productData.price}}});
                    await Wishlist.updateOne({userName:userid},{$pull:{products:{productId:productId}}});
                    // res.json({success:true})
                    res.redirect('/users/viewCart');
                }
            }else{
                const cart = new Cart({
                    userName:userData._id,
                    products:[{
                        productId:productId,
                        productPrice:productData.price
                    }]
                });

                const cartData = await cart.save();
                if(cartData){
                    await Wishlist.updateOne({user:userid},{$pull:{products:{productId:productId}}});
                    res.redirect('/users/viewCart');                   
                }else{
                    res.redirect('/users/login');
                }  
            }
        }else{
            res.redirect('/users/login');
        }
    }catch(error){
        console.log(error.message);
    }
}

module.exports={
    addToWishlist,
    viewWishlist,
    removeWishlist,
    addFromWishlist
}